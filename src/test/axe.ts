import  * as axe from "axe-core";
import { expect } from "vitest";

// The five axe tags used in every scan. Change this line to match your PDF if it differs.
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

export async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: AXE_TAGS },
    // jsdom has no layout, so colour contrast cannot be measured here.
    // The browser test checks contrast.
    rules: { "color-contrast": { enabled: false } },
  });

  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} element(s))`
  );
  expect(summary).toEqual([]); // a failure prints the rule names
}