import { getFrameRuleUrl } from "./frameRuleUrl";

function top(href) {
  const win = { location: { href }, document: { location: { href } } };
  win.parent = win;
  return win;
}
function child(href, parent, referrer = "") {
  return { parent, document: { location: { href }, referrer } };
}

test("srcdoc and nested blank frames use the actual creator page path", () => {
  const root = top("https://reader.example/books/42");
  const blank = {
    ...child("about:blank", root),
    location: { href: "about:blank" },
  };
  expect(getFrameRuleUrl(child("about:srcdoc", blank))).toBe(
    root.location.href
  );
  expect(getFrameRuleUrl(child("blob:https://reader.example/id", root))).toBe(
    root.location.href
  );
});

test("regular HTTP frames retain independent rules and top pages never inherit referrers", () => {
  expect(
    getFrameRuleUrl(
      child("https://other.example/text", top("https://reader.example/"))
    )
  ).toBe("https://other.example/text");
  expect(getFrameRuleUrl(top("about:blank"))).toBe("about:blank");
});

test("cross-origin access denial uses referrer or a known blob creator without inventing paths", () => {
  const parent = {
    get location() {
      throw new Error("denied");
    },
  };
  expect(
    getFrameRuleUrl(
      child("about:srcdoc", parent, "https://reader.example/book")
    )
  ).toBe("https://reader.example/book");
  expect(getFrameRuleUrl(child("blob:https://reader.example/id", parent))).toBe(
    "https://reader.example/"
  );
  expect(getFrameRuleUrl(child("data:text/html,test", parent))).toBe(
    "data:text/html,test"
  );
});
