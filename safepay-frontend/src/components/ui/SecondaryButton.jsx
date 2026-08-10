const SecondaryButton = ({ children }) => {
  return (
    <button className="px-8 py-4 rounded-xl border border-cyan-400 text-cyan-300 hover:bg-cyan-400/10 transition duration-300">
      {children}
    </button>
  );
};

export default SecondaryButton;