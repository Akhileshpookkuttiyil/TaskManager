export const Spinner = ({ size = "md" }) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-9 w-9 border-[3px]",
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizes[size]} animate-spin rounded-full border-neutral-300 border-t-neutral-950 dark:border-neutral-800 dark:border-t-white`}
    />
  );
};
