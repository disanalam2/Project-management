import React, { useState } from 'react';

const SchemasAndFeatures = () => {
  const [selectedDoc, setSelectedDoc] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh', padding: '10px' }}>
      <h2 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Schemas & Features</h2>
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="schema-select" style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Select Document:</label>
        <select 
          id="schema-select" 
          value={selectedDoc} 
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', flex: '1 1 250px', maxWidth: '100%', background: 'var(--card-bg)', color: 'var(--text-main)' }}
        >
          <option value="" disabled>-- Select a Schema / Feature --</option>
          <optgroup label="Web / HTML Versions">
            <option value="/docs/gdg database.html">GDG Database Schema (HTML)</option>
            <option value="/docs/app features schema.html">App Features Schema (HTML)</option>
            <option value="/docs/backend schems.html">Backend Schema (HTML)</option>
            <option value="/docs/web feature schema.html">Web Feature Schema (HTML)</option>
            <option value="/docs/master project arcitecture.html">Master Project Architecture (HTML)</option>
          </optgroup>
          <optgroup label="PDF Versions">
            <option value="/docs/Database Schema - GDG Management Portal.pdf">Database Schema (PDF)</option>
            <option value="/docs/App Features Technical Specification.pdf">App Features Specification (PDF)</option>
            <option value="/docs/Backend API Architecture Specification.pdf">Backend API Specification (PDF)</option>
            <option value="/docs/Web Features Technical Specification.pdf">Web Features Specification (PDF)</option>
            <option value="/docs/GDG Management Portal - Feature Overview (For PR & Product Team).pdf">Feature Overview (PDF)</option>
          </optgroup>
        </select>
      </div>
      
      {selectedDoc ? (
        <iframe src={selectedDoc} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', width: '100%', minHeight: '60vh', background: 'white' }} title="Schema Document"></iframe>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', padding: '20px', border: '2px dashed var(--border)', borderRadius: '8px', minHeight: '60vh' }}>
          Please select a document from the dropdown above.
        </div>
      )}
    </div>
  );
};

export default SchemasAndFeatures;
