const Things = Application("Things3");

// Retrieve all to-dos from the "Inbox" list (or whichever list you prefer)
const todos = Things.toDos().map((todo) => {
  return {
    id: todo.id(),
    name: todo.name(),
  };
});

// Output the tasks as a JSON string
JSON.stringify(todos);
