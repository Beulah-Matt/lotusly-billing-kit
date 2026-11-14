/**
 * Import boundaries that protect design guarantee 1 (README "Design guarantees").
 * See CONTRIBUTING.md, "Rules that are not negotiable", rules 1 and 2.
 */
module.exports = {
  forbidden: [
    {
      name: "core-imports-nothing",
      severity: "error",
      comment:
        "billing-core must not import anything outside packages/core: no other workspace package, " +
        "no npm dependency and no Node built-in. Time, randomness, crypto and telemetry come in through ports.",
      from: { path: "^packages/core/src/" },
      to: { pathNot: "^packages/core/src/" },
    },
    {
      name: "packages-import-only-core-or-testing",
      severity: "error",
      comment:
        "Adapters never import each other. A package may import only itself, billing-core, " +
        "or billing-testing (for contract suites in tests).",
      from: { path: "^packages/([^/]+)/" },
      to: { path: "^packages/", pathNot: "^packages/(core|testing|$1)/" },
    },
    {
      name: "no-unresolvable-imports",
      severity: "error",
      comment:
        "An import that cannot be resolved cannot be checked against the rules above. " +
        "Declare the dependency, or run `pnpm build` first so workspace packages resolve to their dist output.",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
