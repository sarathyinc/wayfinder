import { describe, it, expect } from "vitest";
import { deriveAvailable } from "./available.js";

describe("deriveAvailable", () => {
  it("returns false when source contains FEATURE_ marker", () => {
    const source = `
      import { FEATURE_FLAG } from './flags';
      export default function Page() { return null; }
    `;
    expect(deriveAvailable("/some/route", source)).toBe(false);
  });

  it("returns false when source contains featureFlag call", () => {
    const source = `
      const enabled = featureFlag('new-dashboard');
      export default function Page() { return null; }
    `;
    expect(deriveAvailable("/dashboard", source)).toBe(false);
  });

  it("returns false when source contains feature_flag", () => {
    const source = `
      if (feature_flag.check('beta')) { return null; }
    `;
    expect(deriveAvailable("/beta", source)).toBe(false);
  });

  it("returns false when source contains isEnabled( call", () => {
    const source = `
      if (!isEnabled('some-feature')) return null;
    `;
    expect(deriveAvailable("/route", source)).toBe(false);
  });

  it("returns false when source contains getFlag( call", () => {
    const source = `
      const flag = getFlag('my-feature');
    `;
    expect(deriveAvailable("/route", source)).toBe(false);
  });

  it("returns false when source contains flags. access", () => {
    const source = `
      if (!flags.newUI) return null;
    `;
    expect(deriveAvailable("/route", source)).toBe(false);
  });

  it("returns false when source contains FF_ prefix", () => {
    const source = `
      const show = FF_NEW_ONBOARDING;
    `;
    expect(deriveAvailable("/route", source)).toBe(false);
  });

  it("returns false when source contains process.env.NEXT_PUBLIC_FLAG", () => {
    const source = `
      const enabled = process.env.NEXT_PUBLIC_FLAG_BETA === 'true';
    `;
    expect(deriveAvailable("/route", source)).toBe(false);
  });

  it("returns false when routeKey contains /_ prefix (conventional disabled prefix)", () => {
    expect(
      deriveAvailable("/_disabled", "export default function Page() {}"),
    ).toBe(false);
  });

  it("returns false when routeKey segment starts with _", () => {
    expect(
      deriveAvailable(
        "/dashboard/_wip-feature",
        "export default function Page() {}",
      ),
    ).toBe(false);
  });

  it("returns true for normal source with no feature-flag markers", () => {
    const source = `
      import React from 'react';
      export default function Dashboard() {
        return <div>Hello</div>;
      }
    `;
    expect(deriveAvailable("/dashboard", source)).toBe(true);
  });

  it("returns true for empty source", () => {
    expect(deriveAvailable("/route", "")).toBe(true);
  });
});
