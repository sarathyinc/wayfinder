import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "warn on interactive controls with data-action-id but no defineAction",
    },
    messages: {
      unregistered:
        'Interactive control with data-action-id="{{actionId}}" has no defineAction({ id: "{{actionId}}" }) in this file. Register it with defineAction or remove data-action-id.',
    },
    schema: [],
  },
  create(context) {
    const registeredIds = new Set<string>();
    const pendingNodes: Array<{ node: Rule.Node; actionId: string }> = [];

    return {
      // Collect defineAction({ id: "..." }) calls
      CallExpression(node) {
        const callee = node.callee;
        const isDefineAction =
          (callee.type === "Identifier" && callee.name === "defineAction") ||
          (callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "defineAction");

        if (!isDefineAction) return;

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== "ObjectExpression") return;

        for (const prop of firstArg.properties) {
          if (
            prop.type === "Property" &&
            prop.key.type === "Identifier" &&
            prop.key.name === "id" &&
            prop.value.type === "Literal" &&
            typeof prop.value.value === "string"
          ) {
            registeredIds.add(prop.value.value);
          }
        }
      },

      // Collect button/a with onClick + data-action-id
      JSXOpeningElement(node) {
        const nameNode = node.name;
        if (nameNode.type !== "JSXIdentifier") return;
        if (nameNode.name !== "button" && nameNode.name !== "a") return;

        let hasOnClick = false;
        let actionId: string | null = null;

        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute") continue;

          if (
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "onClick"
          ) {
            hasOnClick = true;
          }

          if (
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "data-action-id"
          ) {
            if (attr.value === null) continue;
            if (
              attr.value.type === "Literal" &&
              typeof attr.value.value === "string"
            ) {
              actionId = attr.value.value;
            } else if (
              attr.value.type === "JSXExpressionContainer" &&
              attr.value.expression.type === "Literal" &&
              typeof attr.value.expression.value === "string"
            ) {
              actionId = attr.value.expression.value;
            }
          }
        }

        if (hasOnClick && actionId !== null) {
          pendingNodes.push({ node: node as unknown as Rule.Node, actionId });
        }
      },

      // After full traversal, report unregistered ones
      "Program:exit"() {
        for (const { node, actionId } of pendingNodes) {
          if (!registeredIds.has(actionId)) {
            context.report({
              node,
              messageId: "unregistered",
              data: { actionId },
            });
          }
        }
      },
    };
  },
};

export default rule;
