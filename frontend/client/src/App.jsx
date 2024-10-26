import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
// import path from 'path-browserify';
import connectSound from './assets/connected.mp3';

// const socket = io('http://localhost:8080');
// const api = window.location.hostname + ':8080';
const api = import.meta.env.BASE_URL;
const socket = io();
// const socket = io();

function App() {
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [buttonText, setButtonText] = useState('Send');
  const [uploadingFlag, setUploadingFlag] = useState(false);
  const [buttonColor, setButtonColor] = useState('btn-primary');
  const [allUploadsComplete, setAllUploadsComplete] = useState(false);
  const fileInputTag = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const connectAudioRef = useRef(null); // Reference for connect sound
  const [playConnectSound, setPlayConnectSound] = useState(false);
  const connectBtnRef = useRef(null);

  useEffect(() => {
    const socketEventHandlers = Object.entries({
      connect() {
        if (!socket.active) return;
        setConnectionStatus(true);
        connectBtnRef.current?.classList.add('visually-hidden');
      },

      disconnect() {
        setConnectionStatus(false);
        connectBtnRef.current?.classList.remove('visually-hidden');
      },

      /**
       * @param {string[]} filePaths 
       */
      downloadFiles(filePaths) {
        filePaths?.forEach(async ({ name, path, isDir }) => {
          const urlcomponent = encodeURIComponent(path);
          const a = document.createElement('a');
          a.href = `./download?q=${urlcomponent}`;
          // a.href = `/download?q=${urlcomponent}`;
          a.download = isDir ? `${name}.zip` : name;
          console.log(a.download);
          a.classList.add('visually-hidden');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // const urlcomponent = encodeURIComponent(file);
          // const url = `http://${api}/download?q=${urlcomponent}`;
          // const name = path.basename(String(file).replaceAll(/\\/g, '/'));
          // const res = await fetch(url);
          // const stream = res.body;

          // const handle = await window.showSaveFilePicker({
          //   suggestedName: name,
          // });
          // const writeable = await handle.createWritable();
          // await stream.pipeTo(writeable);
          // await writeable.close();
        })
      }
    });

    socketEventHandlers.forEach(([evt, handler]) => socket.on(evt, handler));

    return () => socketEventHandlers.forEach(([evt, handler]) => socket.off(evt, handler));
  }, []);

  useEffect(() => {
    if (playConnectSound && connectAudioRef.current) {
      connectAudioRef.current.play().then(() => {
        setPlayConnectSound(false); // Reset state after playing
      }).catch(error => console.error('Error playing connect sound:', error));
    }
  }, [playConnectSound]);

  function clickHandler() {
    setButtonText('Send');
    setButtonColor('btn-primary');
    setFilesToUpload([]);
    setUploadProgress({});
    setAllUploadsComplete(false);
  }

  async function uploadHandler(ev) {
    ev.preventDefault();
    // check if any uploading is in progress
    if (uploadingFlag || !filesToUpload.length) return;

    setUploadingFlag(true);
    setButtonText('Uploading...');
    setButtonColor('btn-warning');

    try {
      const totalSizeBytes = Array.from(filesToUpload)
        .map(file => file.size)
        .reduce((acc, curr) => acc + curr);

      await Promise.all(Array.from(filesToUpload)
        .map((file) => uploadFile(file, totalSizeBytes)));

      setButtonText('Upload Complete');
      setButtonColor('btn-success');
      setAllUploadsComplete(true);
      setUploadingFlag(false);
      fileInputTag.current.value = null;

    } catch (error) {
      setButtonText('Upload Failed');
      setUploadingFlag(false);
      setButtonColor('btn-danger');
      setUploadProgress({});
      setTimeout(() => {
        setButtonText('Send');
        setButtonColor('btn-primary');
      }, 2500);
    }
  }

  function uploadFile(file, totalSizeBytes) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);
      xhr.setRequestHeader('x-total-upload-size', String(totalSizeBytes));
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percentCompleted = Math.round(event.loaded * 100 / event.total);
        setUploadProgress((prevProgress) => ({
          ...prevProgress,
          [file.name]: percentCompleted,
        }));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Failed to upload ${file.name}. Status code: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error(`Network error during upload of ${file.name}`));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  function downloadFile(file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/download?q=${file}`);
      xhr.responseType = 'blob';
      xhr.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const percentCompleted = Math.round(ev.loaded * 100 / ev.total);
        setDownloadProgress((prevProgress) => ({
          ...prevProgress,
          [file.name]: percentCompleted,
        }));
        console.log(percentCompleted);

      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = path.normalize(file).split('\\').pop();  // Set the file name
          document.body.appendChild(link);
          link.click();  // Programmatically trigger the download
          document.body.removeChild(link);  // Clean up
          resolve();
        }
      }
      xhr.onerror = () => reject(new Error('Download file Error' + file));
    });
  }

  const progressBars = Array.from(filesToUpload).map((fileToUpload, idx) => {
    if (allUploadsComplete) return null;
    return (
      <ProgressBar
        file={fileToUpload}
        key={idx}
        progress={uploadProgress[fileToUpload.name] || 0}
      />
    );
  });

  return (
    <div className="container" style={{
      maxWidth: '40rem',
    }}>
      <UploadContainer
        setFiles={setFilesToUpload}
        handleUpload={uploadHandler}
        handleClick={clickHandler}
        buttonText={buttonText}
        buttonColor={buttonColor}
        fileInputRef={fileInputTag}
        connectionStatus={connectionStatus}
        connectionHandler={() => {
          socket.connect()
          setPlayConnectSound(true);
        }}
        connectBtnRef={connectBtnRef}
      />
      <audio ref={connectAudioRef} src={connectSound} preload="auto" />
      <hr />
      <StatusContainer progressBars={progressBars.filter(Boolean)} />
    </div>
  );
}

function ProgressBar({ file, progress }) {
  return (
    <li className="card mb-2">
      <div className="card-body">
        <h6 className="card-title">{file.name}</h6>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            style={{ width: progress + '%' }}
          >
            {progress}%
          </div>
        </div>
      </div>
    </li>
  );
}

function StatusContainer({ progressBars }) {
  if (!progressBars.length) return null;

  return (
    <div className="container">
      <div className="card">
        <h6 className="card-title display-5 text-center pt-3">Progress</h6>
        <ol className="card-body overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {progressBars}
        </ol>
      </div>
    </div>
  );
}

function ConnectionStatus({ connStatus }) {
  return (
    <div className="row align-items-center">
      <div className="col-1 me-3">
        <h6>status:</h6>
      </div>
      <div className="col">
        {connStatus ?
          <h6 className="text-success-emphasis p-2">connected ✅</h6> :
          <h6 className="text-danger-emphasis p-2">disconnected ❌</h6>
        }
      </div>
    </div>
  )
}

function UploadContainer({
  setFiles,
  handleUpload,
  handleClick,
  buttonText,
  buttonColor,
  fileInputRef,
  connectionStatus,
  connectionHandler,
  connectBtnRef
}) {
  return (
    <div className="container mt-5 mb-3">
      <form onSubmit={handleUpload}>
        <div htmlFor="file" className="col form-label display-6 mb-3">
          Select Files To Send
          <button
            className='btn btn-info float-end ps-3 pe-3'
            onClick={connectionHandler}
            ref={connectBtnRef}
          >
            connect
          </button>
        </div>
        <input
          type="file"
          name="file"
          className="form-control form-control mb-3"
          id="file"
          onChange={(ev) => setFiles(ev.target.files)}
          onClick={handleClick}
          ref={fileInputRef}
          multiple
        />
        <button
          className={`btn w-100 mb-3 p-2 ${buttonColor}`}
        >
          {buttonText}
        </button>
      </form>
      <ConnectionStatus connStatus={connectionStatus} />
    </div>
  );
}

export default App;
