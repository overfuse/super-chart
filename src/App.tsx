import Controls from "./components/Controls";
import FileUpload from "./components/FileUpload";
import ExternalView from "./components/ExternalView";
import LocalView from "./components/LocalView";
import useCSVWorker from "./hooks/useCSVWorker";
import { useStore } from "./store";
import usePlayback from "./hooks/usePlayback";
import Header from "./components/Header";

export default function App() {
  useCSVWorker();
  usePlayback();

  const dataVersion = useStore((s) => s.dataVersion);
  const useExternal = useStore((s) => s.useExternalStorage);
  const totalRows = useStore((s) => (s.useExternalStorage ? s.totalRows : (s.x?.length ?? 0)));
  const View = useExternal ? ExternalView : LocalView;

  return (
    <div className="space-y-6 mx-auto w-[1002px]">
      <Header />
      <FileUpload />
      {totalRows > 0 && (
        <>
          <Controls />
          <View key={dataVersion} />
        </>
      )}
    </div>
  );
}
