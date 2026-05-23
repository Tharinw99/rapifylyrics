import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DriveView } from './components/DriveView';
import { EditorView } from './components/EditorView';
import { PlanView } from './components/PlanView';
import { AlbumView } from './components/AlbumView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DriveView />} />
        <Route path="/editor/:songId" element={<EditorView />} />
        <Route path="/plan/:planId" element={<PlanView />} />
        <Route path="/album/:albumId" element={<AlbumView />} />
      </Routes>
    </BrowserRouter>
  );
}

