const toMongoId = (record) => ({
  ...record,
  _id: record.id,
});

const serializeUser = (user) => {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return toMongoId({
    ...safeUser,
    avatar: safeUser.avatar || "",
  });
};

const serializeTask = (task) => {
  if (!task) return null;

  const serialized = toMongoId({
    ...task,
    description: task.description || "",
    dueDate: task.dueDate || null,
    tags: task.tags || [],
  });

  if (task.userId) {
    serialized.user = task.userId;
  }

  return serialized;
};

module.exports = { serializeUser, serializeTask };
