import React, { useEffect } from 'react';
import { useState } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import QRCode from 'qrcode';

function App() {
  const [countFiles, setCountFiles] = useState(0);
  const [countFolders, setCountFolders] = useState(0);
  const [filesToSend, setFilesToSend] = useState([]);
  const [folderToSend, setFolderToSend] = useState([]);

  return (
    <div className="container mt-3">
      <QrCodeContainer />
      <DestinationFolder />
      <UploadContainer
        countFiles={countFiles}
        countFolders={countFolders}
        chooseFileHandler={async (ev) => {
          const { cancelled, filePaths } = await window.Api.openFileDialog();
          if (cancelled) return;
          setFilesToSend(filePaths);
          setCountFiles(filePaths.length);
        }}
        chooseFolderHandler={async (ev) => {
          const { cancelled, filePaths } = await window.Api.openFolderDialog();
          if (cancelled) return;
          setFolderToSend(filePaths);
          setCountFolders(filePaths.length);
        }}
        sendFileHandler={() => window.Api.invokeFilesDownload(filesToSend, false)}
        sendFolderHandler={() => window.Api.invokeFilesDownload(folderToSend, true)}
      />
      {/* <ZippingIndicator /> */}
      <ProgressContainer />
    </div>
  );
}

function UploadContainer({
  countFiles,
  countFolders,
  chooseFileHandler,
  chooseFolderHandler,
  sendFileHandler,
  sendFolderHandler
}) {
  return (
    <div className='container'>
      <div className='mb-3 '>
        <label htmlFor='file' className='display-6 mb-2'>Files</label>
        <div className='mb-1'>
          <button
            className='btn btn-success me-3'
            onClick={chooseFileHandler}
          >Choose Files</button>
          <span className=''>{countFiles} selected</span>
        </div>
        <button
          className='btn btn-primary w-100'
          onClick={sendFileHandler}>Send Files</button>
      </div>
      <hr></hr>
      <div className='mb-3'>
        <label htmlFor='folder' className='display-6 mb-2'>Folder</label>
        <div className='mb-1'>
          <button
            className='btn btn-success me-2'
            onClick={chooseFolderHandler}
          >Choose Folder</button>
          <span className=''>{countFolders} selected</span>
        </div>
        <button
          className='btn btn-primary w-100'
          onClick={sendFolderHandler}
        >Send Folder</button>
      </div>
      <hr></hr>
    </div>
  );
}

function DestinationFolder() {
  const [destFolder, setDestFolder] = useState(null);

  (async () => {
    const folder = await window.Api.getDestFolder();
    setDestFolder(folder);
  })();

  return (
    <div className='container'>
      <p className='text-info-emphasis mb-1'>Destination Folder</p>
      <div className="input-group mb-3 overflow-x-hidden">
        <button
          className="btn btn-info"
          onClick={() => window.Api.openDestFolder()}
        >Open📁</button>
        <code
          className="form-control text-truncate text-secondary"
        >
          {destFolder}
        </code>
        <button
          className="btn btn-warning"
          onClick={async () => {
            await window.Api.changeDestFolder();
            const folder = await window.Api.getDestFolder();
            setDestFolder(folder);
          }}
        >Change</button>
      </div>
    </div>
  );
}

function ProgressContainer() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function uploadProgressHandler(ev) {
      if (width >= 100) {
        setWidth(0);
        return;
      }
      setWidth(ev.detail.percentage);
    }

    window.addEventListener('uploadProgress', uploadProgressHandler);
  }, []);

  return (
    <div className='container mb-3'>
      <ProgressBar width={width} text='Reciving' />
    </div>
  );
}

function ProgressBar({ width, text }) {
  return (
    <div className={width >= 100 || width == 0 ? 'visually-hidden' : ''}>
      <div
        className="progress"
        role="progressbar"
        aria-label="Progress"
        aria-valuenow={width}
        aria-valuemin="0"
        aria-valuemax="100"
        style={{ height: '1.2rem' }}
      >
        <div
          className="progress-bar progress-bar-striped progress-bar-animated"
          style={{ width: `${width}%` }}
        >
          {`${text} ${width.toPrecision(2)}%...`}
        </div>
      </div>
    </div>
  );
}


function QrCodeContainer() {
  const [qrcode, setQrcode] = useState('');
  const [urlText, setUrlText] = useState(null);
  // oonly show Qrcode when Wi-Fi is Avilable
  const [showQrCode, setShowQrcode] = useState(false);

  // window.Api.getIfaces().then(({ ifaces, wifiIfaces, port }) => {
  //   Array.from(wifiIfaces).forEach(async (addr) => {
  //     setQrcode(await QRCode.toDataURL(`http://${addr}:${port}`));
  //   });

  //   setUrlText(
  //     Object.entries(ifaces).map(([iface, addrs], idx) => {
  //       if (!addrs.length) return;
  //       return <div key={idx} className='float-start'>
  //         <h6>On {iface} visit</h6>
  //         {Array.from(addrs).map((addr, idx) => {
  //           return <p key={idx} className='text-center'>http://{addr}:{port}</p>
  //         })}
  //       </div>
  //     }))
  // });
  useEffect(() => {

    window.addEventListener('interfaces', (ev) => {
      const { ifaces, wifiIfaces, port } = ev.detail.ifaces;
      if (wifiIfaces.length) {
        setShowQrcode(true);
        Array.from(wifiIfaces).forEach(async (addr) => {
          setQrcode(await QRCode.toDataURL(`http://${addr}:${port}`));
        });
      } else {
        setShowQrcode(false);
      }

      setUrlText(
        Object.entries(ifaces).map(([iface, addrs], idx) => {
          if (!addrs.length) return;
          return <div key={idx} className='float-start'>
            <h6>On {iface} visit</h6>
            {Array.from(addrs).map((addr, idx) => {
              return <p key={idx} className='text-center'>http://{addr}:{port}</p>
            })}
          </div>
        }))
    })

  }, []);


  return (
    <div className='container'>
      <div className='row mb-3'>
        <div className='col-4'>
          {showQrCode ? (
            <>
              <img
                src={qrcode}
                alt=''
                className='img-fluid border rounded'
                style={{ maxHeight: '155px', minWidth: '115px', maxWidth: '115px' }}
              />
              <h5 className='text-center text-secondary-emphasis mt-3 '>scan</h5>
            </>
          ) : (
            <p className='text-info'>No Wireless network detected but still accesed from url's on right ⚠️ </p>
          )}
        </div>
        <div className='col'>
          <code>{urlText}</code>
        </div>
      </div>
    </div>
  )
}

export default App;
