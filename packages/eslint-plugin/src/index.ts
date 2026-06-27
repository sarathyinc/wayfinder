import noUnregisteredAction from "./rules/no-unregistered-action.js";

const plugin = {
  rules: {
    "no-unregistered-action": noUnregisteredAction,
  },
};

export default plugin;
