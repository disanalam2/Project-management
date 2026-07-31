import React, { useState } from 'react';

const DeveloperHandoffs = () => {
  const [selectedDoc, setSelectedDoc] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh', padding: '10px' }}>
      <h2 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Developer Handoffs</h2>
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="dev-select" style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Select Developer:</label>
        <select 
          id="dev-select" 
          value={selectedDoc} 
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', flex: '1 1 250px', maxWidth: '100%', background: 'var(--card-bg)', color: 'var(--text-main)' }}
        >
          <option value="" disabled>-- Select a Developer Handoff --</option>
          <optgroup label="App Developers">
            <option value="/docs/GDG_HTML_Handoffs/App_Dev1_Handoff.html">App Dev 1</option>
            <option value="/docs/GDG_HTML_Handoffs/App_Dev2_Handoff.html">App Dev 2</option>
            <option value="/docs/GDG_HTML_Handoffs/App_Dev3_Handoff.html">App Dev 3</option>
            <option value="/docs/GDG_HTML_Handoffs/App_Dev4_Handoff.html">App Dev 4</option>
          </optgroup>
          <optgroup label="Backend Developers">
            <option value="/docs/GDG_HTML_Handoffs/Backend_Dev1_Handoff.html">Backend Dev 1</option>
            <option value="/docs/GDG_HTML_Handoffs/Backend_Dev2_Handoff.html">Backend Dev 2</option>
            <option value="/docs/GDG_HTML_Handoffs/Backend_Dev3_Handoff.html">Backend Dev 3</option>
            <option value="/docs/GDG_HTML_Handoffs/Backend_Dev4_Handoff.html">Backend Dev 4</option>
          </optgroup>
          <optgroup label="Web Developers">
            <option value="/docs/GDG_HTML_Handoffs/Web_Dev1_Handoff.html">Web Dev 1</option>
            <option value="/docs/GDG_HTML_Handoffs/Web_Dev2_Handoff.html">Web Dev 2</option>
            <option value="/docs/GDG_HTML_Handoffs/Web_Dev3_Handoff.html">Web Dev 3</option>
            <option value="/docs/GDG_HTML_Handoffs/Web_Dev4_Handoff.html">Web Dev 4</option>
            <option value="/docs/GDG_HTML_Handoffs/Web_Dev5_Handoff.html">Web Dev 5</option>
          </optgroup>
        </select>
      </div>
      
      {selectedDoc ? (
        <iframe src={selectedDoc} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', width: '100%', minHeight: '60vh', background: 'white' }} title="Developer Handoff"></iframe>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', padding: '20px', border: '2px dashed var(--border)', borderRadius: '8px', minHeight: '60vh' }}>
          Please select a developer from the dropdown above.
        </div>
      )}
    </div>
  );
};

export default DeveloperHandoffs;
