const Loader = ({ fullScreen = false }) => {
  return (
    <div className={fullScreen ? "loader-overlay" : "loader-container"}>
      <div className="loader-spinner"></div>
      {fullScreen && <p>Please wait...</p>}
    </div>
  );
};

export default Loader;
