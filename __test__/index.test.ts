import * as core from "express-zod";

describe("express-zod", () => {
    it("exposes a loadable entry point", () => {
        expect(core).toBeTypeOf("object");
    });
});
