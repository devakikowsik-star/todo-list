const overdue = () => {
  return all.filter((todo) => todo.dueDate < today);
};

const dueToday = () => {
  return all.filter((todo) => todo.dueDate === today);
};

const dueLater = () => {
  return all.filter((todo) => todo.dueDate > today);
};

const toDisplayableList = (list) => {
  return list
    .map((todo) => {
      let status = todo.completed ? "[x]" : "[ ]";

      if (todo.dueDate === today) {
        return `${status} ${todo.title}`;
      }

      return `${status} ${todo.title} ${todo.dueDate}`;
    })
    .join("\n");
};