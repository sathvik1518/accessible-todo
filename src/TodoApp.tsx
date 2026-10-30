import { useEffect, useRef, useState, type FormEvent } from "react";

type Task = { id: number; title: string; done: boolean };

let nextId = 1;

export default function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState<Task | null>(null); // task waiting for delete confirmation

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null); // where focus goes when the dialog closes

  // Open the dialog as a modal once it is on the screen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (pending && dialog && !dialog.open) dialog.showModal();
  }, [pending]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setError("Enter a task name.");
      inputRef.current?.focus(); // the error is linked to the field, so focus reads it
      return;
    }
    const id = nextId++;
    setTasks((prev) => [...prev, { id, title: clean, done: false }]);
    setTitle("");
    setError("");
    setStatus(`Task added: ${clean}`);
    inputRef.current?.focus();
  }

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function askDelete(task: Task, opener: HTMLElement) {
    returnFocusRef.current = opener;
    setPending(task);
  }

  function confirmDelete() {
    if (!pending) return;
    const removed = pending;
    setTasks((prev) => prev.filter((t) => t.id !== removed.id));
    setStatus(`Task deleted: ${removed.title}`);
    returnFocusRef.current = inputRef.current; // the deleted item is gone, so go to the input
    dialogRef.current?.close();
  }

  // Runs on Cancel, on Escape and after Delete. Focus goes back to a safe place.
  function handleDialogClose() {
    setPending(null);
    returnFocusRef.current?.focus();
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <main id="main" tabIndex={-1}>
        <h1>To-do list</h1>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="new-task">New task</label>
          <div className="row">
            <input
              ref={inputRef}
              id="new-task"
              type="text"
              autoComplete="off"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "task-error" : undefined}
            />
            <button type="submit">Add</button>
          </div>
          {error && (
            <p id="task-error" className="error">
              {error}
            </p>
          )}
        </form>

        {/* Always on the page, so screen readers announce changes to its text */}
        <p role="status" className="status">
          {status}
        </p>

        {tasks.length === 0 ? (
          <p>No tasks yet</p>
        ) : (
          <ul>
            {tasks.map((t) => (
              <li key={t.id}>
                <input
                  id={`task-${t.id}`}
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                />
                <label htmlFor={`task-${t.id}`} className={t.done ? "done" : ""}>
                  {t.title}
                </label>
                <button
                  type="button"
                  className="danger-outline"
                  aria-label={`Delete ${t.title}`}
                  onClick={(e) => askDelete(t, e.currentTarget)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {pending && (
          <dialog
            ref={dialogRef}
            aria-labelledby="confirm-title"
            aria-describedby="confirm-text"
            onClose={handleDialogClose}
          >
            <h2 id="confirm-title">Delete task?</h2>
            <p id="confirm-text">This will remove: {pending.title}</p>
            <div className="actions">
              {/* Cancel is first, so it gets focus when the dialog opens */}
              <button
                type="button"
                className="secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </dialog>
        )}
      </main>
    </>
  );
}