import { useContext } from "react";
import { Toaster } from "react-hot-toast";

import { LoadingContext } from "./contexts/LoadingContext";
import Loader from "./components/common/Loader";
import AppRoutes from "./routes/AppRoutes";

import "./App.css";

const App = () => {
  const { isLoading } = useContext(LoadingContext);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#111622",
            color: "#e2e8f0",
            border: "1px solid #1e2638",
          },
        }}
      />

      {isLoading && <Loader fullScreen />}

      <div className="app">
        <AppRoutes />
      </div>
    </>
  );
};

export default App;
