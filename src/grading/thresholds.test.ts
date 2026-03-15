import { describe, it, expect } from "vitest";
import { gradeDimension, gradeToValue, valueToGrade } from "../dimensions.js";

describe("gradeToValue", () => {
  it("maps each grade to its numeric value", () => {
    expect(gradeToValue("A")).toBe(4);
    expect(gradeToValue("B")).toBe(3);
    expect(gradeToValue("C")).toBe(2);
    expect(gradeToValue("D")).toBe(1);
    expect(gradeToValue("F")).toBe(0);
  });
});

describe("valueToGrade", () => {
  it("maps each numeric value to its grade", () => {
    expect(valueToGrade(4)).toBe("A");
    expect(valueToGrade(3)).toBe("B");
    expect(valueToGrade(2)).toBe("C");
    expect(valueToGrade(1)).toBe("D");
    expect(valueToGrade(0)).toBe("F");
  });
});

describe("gradeDimension", () => {
  describe("cycles", () => {
    it("grades 0 cycles as A", () => {
      expect(gradeDimension("cycles", 0)).toBe("A");
    });

    it("grades 1 cycle as B", () => {
      expect(gradeDimension("cycles", 1)).toBe("B");
    });

    it("grades 2 cycles as C", () => {
      expect(gradeDimension("cycles", 2)).toBe("C");
    });

    it("grades 3 cycles as C", () => {
      expect(gradeDimension("cycles", 3)).toBe("C");
    });

    it("grades 4 cycles as D", () => {
      expect(gradeDimension("cycles", 4)).toBe("D");
    });

    it("grades 6 cycles as D", () => {
      expect(gradeDimension("cycles", 6)).toBe("D");
    });

    it("grades 7 cycles as F", () => {
      expect(gradeDimension("cycles", 7)).toBe("F");
    });

    it("grades 100 cycles as F", () => {
      expect(gradeDimension("cycles", 100)).toBe("F");
    });
  });

  describe("coupling", () => {
    it("grades 0.0 as A", () => {
      expect(gradeDimension("coupling", 0.0)).toBe("A");
    });

    it("grades exactly 0.20 as A", () => {
      expect(gradeDimension("coupling", 0.2)).toBe("A");
    });

    it("grades 0.21 as B", () => {
      expect(gradeDimension("coupling", 0.21)).toBe("B");
    });

    it("grades exactly 0.35 as B", () => {
      expect(gradeDimension("coupling", 0.35)).toBe("B");
    });

    it("grades 0.36 as C", () => {
      expect(gradeDimension("coupling", 0.36)).toBe("C");
    });

    it("grades exactly 0.50 as C", () => {
      expect(gradeDimension("coupling", 0.5)).toBe("C");
    });

    it("grades 0.51 as D", () => {
      expect(gradeDimension("coupling", 0.51)).toBe("D");
    });

    it("grades exactly 0.70 as D", () => {
      expect(gradeDimension("coupling", 0.7)).toBe("D");
    });

    it("grades 0.71 as F", () => {
      expect(gradeDimension("coupling", 0.71)).toBe("F");
    });

    it("grades 1.0 as F", () => {
      expect(gradeDimension("coupling", 1.0)).toBe("F");
    });
  });

  describe("depth", () => {
    it("grades 1 as A", () => {
      expect(gradeDimension("depth", 1)).toBe("A");
    });

    it("grades exactly 5 as A", () => {
      expect(gradeDimension("depth", 5)).toBe("A");
    });

    it("grades 6 as B", () => {
      expect(gradeDimension("depth", 6)).toBe("B");
    });

    it("grades exactly 8 as B", () => {
      expect(gradeDimension("depth", 8)).toBe("B");
    });

    it("grades 9 as C", () => {
      expect(gradeDimension("depth", 9)).toBe("C");
    });

    it("grades exactly 10 as C", () => {
      expect(gradeDimension("depth", 10)).toBe("C");
    });

    it("grades 11 as D", () => {
      expect(gradeDimension("depth", 11)).toBe("D");
    });

    it("grades exactly 15 as D", () => {
      expect(gradeDimension("depth", 15)).toBe("D");
    });

    it("grades 16 as F", () => {
      expect(gradeDimension("depth", 16)).toBe("F");
    });
  });

  describe("godFiles", () => {
    it("grades 0 as A", () => {
      expect(gradeDimension("godFiles", 0)).toBe("A");
    });

    it("grades 0.005 as B", () => {
      expect(gradeDimension("godFiles", 0.005)).toBe("B");
    });

    it("grades exactly 0.01 as B", () => {
      expect(gradeDimension("godFiles", 0.01)).toBe("B");
    });

    it("grades 0.011 as C", () => {
      expect(gradeDimension("godFiles", 0.011)).toBe("C");
    });

    it("grades exactly 0.03 as C", () => {
      expect(gradeDimension("godFiles", 0.03)).toBe("C");
    });

    it("grades 0.031 as D", () => {
      expect(gradeDimension("godFiles", 0.031)).toBe("D");
    });

    it("grades exactly 0.05 as D", () => {
      expect(gradeDimension("godFiles", 0.05)).toBe("D");
    });

    it("grades 0.051 as F", () => {
      expect(gradeDimension("godFiles", 0.051)).toBe("F");
    });
  });

  describe("complexFn", () => {
    it("grades 0 as A", () => {
      expect(gradeDimension("complexFn", 0)).toBe("A");
    });

    it("grades exactly 0.02 as A", () => {
      expect(gradeDimension("complexFn", 0.02)).toBe("A");
    });

    it("grades 0.021 as B", () => {
      expect(gradeDimension("complexFn", 0.021)).toBe("B");
    });

    it("grades exactly 0.05 as B", () => {
      expect(gradeDimension("complexFn", 0.05)).toBe("B");
    });

    it("grades 0.051 as C", () => {
      expect(gradeDimension("complexFn", 0.051)).toBe("C");
    });

    it("grades exactly 0.10 as C", () => {
      expect(gradeDimension("complexFn", 0.1)).toBe("C");
    });

    it("grades 0.101 as D", () => {
      expect(gradeDimension("complexFn", 0.101)).toBe("D");
    });

    it("grades exactly 0.20 as D", () => {
      expect(gradeDimension("complexFn", 0.2)).toBe("D");
    });

    it("grades 0.201 as F", () => {
      expect(gradeDimension("complexFn", 0.201)).toBe("F");
    });
  });

  describe("levelization", () => {
    it("grades 0 as A", () => {
      expect(gradeDimension("levelization", 0)).toBe("A");
    });

    it("grades 0.001 as B", () => {
      expect(gradeDimension("levelization", 0.001)).toBe("B");
    });

    it("grades exactly 0.02 as B", () => {
      expect(gradeDimension("levelization", 0.02)).toBe("B");
    });

    it("grades 0.021 as C", () => {
      expect(gradeDimension("levelization", 0.021)).toBe("C");
    });

    it("grades exactly 0.05 as C", () => {
      expect(gradeDimension("levelization", 0.05)).toBe("C");
    });

    it("grades 0.051 as D", () => {
      expect(gradeDimension("levelization", 0.051)).toBe("D");
    });

    it("grades exactly 0.10 as D", () => {
      expect(gradeDimension("levelization", 0.1)).toBe("D");
    });

    it("grades 0.101 as F", () => {
      expect(gradeDimension("levelization", 0.101)).toBe("F");
    });
  });

  describe("blastRadius", () => {
    it("grades 0 as A", () => {
      expect(gradeDimension("blastRadius", 0)).toBe("A");
    });

    it("grades exactly 0.10 as A", () => {
      expect(gradeDimension("blastRadius", 0.1)).toBe("A");
    });

    it("grades 0.11 as B", () => {
      expect(gradeDimension("blastRadius", 0.11)).toBe("B");
    });

    it("grades exactly 0.20 as B", () => {
      expect(gradeDimension("blastRadius", 0.2)).toBe("B");
    });

    it("grades 0.21 as C", () => {
      expect(gradeDimension("blastRadius", 0.21)).toBe("C");
    });

    it("grades exactly 0.35 as C", () => {
      expect(gradeDimension("blastRadius", 0.35)).toBe("C");
    });

    it("grades 0.36 as D", () => {
      expect(gradeDimension("blastRadius", 0.36)).toBe("D");
    });

    it("grades exactly 0.50 as D", () => {
      expect(gradeDimension("blastRadius", 0.5)).toBe("D");
    });

    it("grades 0.51 as F", () => {
      expect(gradeDimension("blastRadius", 0.51)).toBe("F");
    });
  });
});
