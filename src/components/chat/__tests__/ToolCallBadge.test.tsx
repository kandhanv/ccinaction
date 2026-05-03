import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getLabel } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// ─── getLabel unit tests ──────────────────────────────────────────────────────

test("getLabel: str_replace_editor create", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "src/App.jsx" })).toBe("Creating App.jsx");
});

test("getLabel: str_replace_editor str_replace", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "src/components/Card.tsx" })).toBe("Editing Card.tsx");
});

test("getLabel: str_replace_editor insert", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "src/utils.ts" })).toBe("Editing utils.ts");
});

test("getLabel: str_replace_editor view", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "src/index.tsx" })).toBe("Reading index.tsx");
});

test("getLabel: str_replace_editor undo_edit", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getLabel: str_replace_editor unknown command falls back to Modifying", () => {
  expect(getLabel("str_replace_editor", { command: "unknown", path: "src/App.jsx" })).toBe("Modifying App.jsx");
});

test("getLabel: file_manager rename", () => {
  expect(getLabel("file_manager", { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" })).toBe("Renaming Old.tsx to New.tsx");
});

test("getLabel: file_manager delete", () => {
  expect(getLabel("file_manager", { command: "delete", path: "src/Unused.tsx" })).toBe("Deleting Unused.tsx");
});

test("getLabel: file_manager unknown command falls back to Managing", () => {
  expect(getLabel("file_manager", { command: "???", path: "src/File.tsx" })).toBe("Managing File.tsx");
});

test("getLabel: unknown tool returns tool name", () => {
  expect(getLabel("some_other_tool", { command: "do", path: "x" })).toBe("some_other_tool");
});

test("getLabel: extracts filename from nested path", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "src/components/ui/Button.tsx" })).toBe("Creating Button.tsx");
});

// ─── ToolCallBadge rendering tests ───────────────────────────────────────────

function makeInvocation(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/App.jsx" },
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

test("ToolCallBadge shows friendly label for create command", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation()} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows spinner while in-progress", () => {
  const { container } = render(<ToolCallBadge toolInvocation={makeInvocation({ state: "call" })} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows green dot when result is present", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "result", result: "ok" } as ToolInvocation)}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when state is result but result is null", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "result", result: null } as ToolInvocation)}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows label for file_manager delete", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "delete", path: "src/Old.tsx" },
      })}
    />
  );
  expect(screen.getByText("Deleting Old.tsx")).toBeDefined();
});

test("ToolCallBadge shows label for file_manager rename", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" },
      })}
    />
  );
  expect(screen.getByText("Renaming Old.tsx to New.tsx")).toBeDefined();
});

test("ToolCallBadge shows label for str_replace (editing)", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "str_replace", path: "src/components/Card.tsx" },
      })}
    />
  );
  expect(screen.getByText("Editing Card.tsx")).toBeDefined();
});
