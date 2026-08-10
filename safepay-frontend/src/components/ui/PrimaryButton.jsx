const PrimaryButton = ({ children }) => {
  return (
    <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:scale-105 transition duration-300">
      {children}
    </button>
  );
};

export default PrimaryButton;