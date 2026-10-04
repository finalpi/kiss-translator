import { favoriteWordIndex, normalizeWordForms } from "./favoriteWordForms";

test("keeps only dictionary word forms without guessing extra inflections", () => {
  expect(
    normalizeWordForms([
      " Weeds ",
      "WEEDS",
      null,
      {},
      "<b>weeds</b>",
      "plural: weeds",
      "weed.*",
      "mother-in-law",
    ])
  ).toEqual(["weeds", "mother-in-law"]);
  expect([...favoriteWordIndex({ weed: { forms: ["weeds"] } }).owners]).toEqual(
    [
      ["weed", "weed"],
      ["weeds", "weed"],
    ]
  );
});

test("exact favorites win and old lists/metadata remain compatible", () => {
  const index = favoriteWordIndex({
    compost: { forms: ["composting"] },
    composting: { createdAt: 1 },
    old: true,
  });
  expect(index.owners.get("composting")).toBe("composting");
  expect(index.owners.get("old")).toBe("old");
  expect([...favoriteWordIndex(["Weed", "weed"]).owners.keys()]).toEqual([
    "weed",
  ]);
});
