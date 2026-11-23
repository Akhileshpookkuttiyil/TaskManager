import { useMemo } from "react";
import { useDispatch } from "react-redux";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { updateTask } from "../../store/slices/tasksSlice";
import { TaskCard } from "./TaskCard";
import toast from "react-hot-toast";

const COLUMNS = [
  { id: "pending", title: "Pending", color: "border-t-neutral-500" },
  { id: "in_progress", title: "In Progress", color: "border-t-[var(--text-primary)]" },
  { id: "completed", title: "Completed", color: "border-t-green-500" },
  { id: "archived", title: "Archived", color: "border-t-neutral-400" },
];

export const KanbanView = ({ tasks = [], onEdit, onDelete, onComplete }) => {
  const dispatch = useDispatch();

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups = {
      pending: [],
      in_progress: [],
      completed: [],
      archived: [],
    };
    tasks.forEach((task) => {
      const status = task.status || "pending";
      if (groups[status] !== undefined) {
        groups[status].push(task);
      }
    });
    return groups;
  }, [tasks]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Drop outside any column
    if (!destination) return;

    // Position or column didn't change
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    
    // Find dragging task
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    // Optimistically update status
    const updateResult = await dispatch(
      updateTask({
        id: taskId,
        data: { ...task, status: newStatus },
      })
    );

    if (updateTask.fulfilled.match(updateResult)) {
      toast.success(`Moved to ${newStatus.replace("_", " ")}`);
    } else {
      toast.error("Failed to move task.");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 h-[calc(100vh-21rem)] min-h-[440px] select-none scrollbar-none">
        {COLUMNS.map((col) => {
          const colTasks = groupedTasks[col.id] || [];
          return (
            <div
              key={col.id}
              className={`card flex flex-col border-t-4 ${col.color} bg-elevated p-3 w-[280px] sm:w-[300px] md:w-auto md:flex-1 shrink-0 max-h-full`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <h4 className="text-sm font-bold text-primary capitalize">
                  {col.title}
                </h4>
                <span className="rounded bg-app border border-subtle px-2 py-0.5 text-xs font-semibold text-secondary tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto space-y-2.5 rounded-lg p-1 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-hover"
                        : "bg-transparent"
                    }`}
                  >
                    {colTasks.map((task, idx) => (
                      <Draggable key={task._id} draggableId={task._id} index={idx}>
                        {(providedDraggable, snapshotDraggable) => (
                          <div
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            className={`transform-none ${
                              snapshotDraggable.isDragging ? "z-50 scale-[1.01]" : ""
                            }`}
                          >
                            <TaskCard
                              task={task}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onComplete={onComplete}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
export default KanbanView;
