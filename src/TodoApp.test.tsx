import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodoApp from "./TodoApp";
import { expectNoViolations } from "./test/axe";

type User = ReturnType<typeof userEvent.setup>;

async function addTask(user: User, title: string) {
  await user.type(screen.getByRole("textbox", { name: "New task" }), title);
  await user.click(screen.getByRole("button", { name: "Add" }));
}

describe("accessibility scans (axe)", () => {
  it("has no violations when the list is empty", async () => {
    const { container } = render(<TodoApp />);
    await expectNoViolations(container);
  });

  it("has no violations with tasks, one of them done", async () => {
    const user = userEvent.setup();
    const { container } = render(<TodoApp />);
    await addTask(user, "Buy milk");
    await addTask(user, "Pay rent");
    await user.click(screen.getByRole("checkbox", { name: "Pay rent" }));
    await expectNoViolations(container);
  });

  it("has no violations while the error is shown", async () => {
    const user = userEvent.setup();
    const { container } = render(<TodoApp />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Enter a task name.")).toBeInTheDocument();
    await expectNoViolations(container);
  });

  it("has no violations while the delete dialog is open", async () => {
    const user = userEvent.setup();
    const { container } = render(<TodoApp />);
    await addTask(user, "Buy milk");
    await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));
    expect(screen.getByRole("dialog", { name: "Delete task?" })).toBeInTheDocument();
    await expectNoViolations(container);
  });
});

describe("TodoApp behaviour (found by role)", () => {
  it("gives every control a name", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await addTask(user, "Buy milk");

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "To-do list" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("textbox", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Buy milk" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Buy milk" })).toBeInTheDocument();
  });

  it("shows 'No tasks yet' when the list is empty", () => {
    render(<TodoApp />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("adds a task, clears the field, keeps focus there and announces it", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await addTask(user, "Buy milk");

    const input = screen.getByRole("textbox", { name: "New task" });
    expect(screen.getByRole("checkbox", { name: "Buy milk" })).not.toBeChecked();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Task added: Buy milk");
  });

  it("marks a task done and not done", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await addTask(user, "Buy milk");

    const box = screen.getByRole("checkbox", { name: "Buy milk" });
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
  });

  it("links the error to the field and clears it when you type", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await user.click(screen.getByRole("button", { name: "Add" }));

    const input = screen.getByRole("textbox", { name: "New task" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Enter a task name.");
    expect(input).toHaveFocus();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();

    await user.type(input, "a");
    expect(screen.queryByText("Enter a task name.")).not.toBeInTheDocument();
    expect(input).toBeValid();
  });

  it("asks first when deleting, and Cancel keeps the task and returns focus", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await addTask(user, "Buy milk");

    const opener = screen.getByRole("button", { name: "Delete Buy milk" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Delete task?" });
    expect(screen.getByRole("checkbox", { name: "Buy milk" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Buy milk" })).toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("deletes after confirming, announces it and moves focus to the field", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await addTask(user, "Buy milk");

    await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));
    const dialog = screen.getByRole("dialog", { name: "Delete task?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Buy milk" })).not.toBeInTheDocument();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Task deleted: Buy milk");
    expect(screen.getByRole("textbox", { name: "New task" })).toHaveFocus();
  });

  it("works with the keyboard only", async () => {
    const user = userEvent.setup();
    render(<TodoApp />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "New task" })).toHaveFocus();

    await user.keyboard("Buy milk{Enter}"); // Enter submits the form
    expect(screen.getByRole("checkbox", { name: "Buy milk" })).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole("button", { name: "Add" })).toHaveFocus();
    await user.tab();
    const box = screen.getByRole("checkbox", { name: "Buy milk" });
    expect(box).toHaveFocus();
    await user.keyboard("[Space]"); // Space toggles a checkbox
    expect(box).toBeChecked();

    await user.tab();
    expect(screen.getByRole("button", { name: "Delete Buy milk" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Delete task?" })).toBeInTheDocument();

    await user.tab(); // Cancel
    await user.tab(); // Delete in the dialog
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })
    ).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "New task" })).toHaveFocus();
  });
});