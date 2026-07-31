import React, { useState } from 'react';

const WorkDistribution = () => {
  const [selectedDoc, setSelectedDoc] = useState('/docs/work ditribution.html');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh', padding: '10px' }}>
      <h2 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Work Distribution</h2>
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="work-select" style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Select Format:</label>
        <select 
          id="work-select" 
          value={selectedDoc} 
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', flex: '1 1 250px', maxWidth: '100%', background: 'var(--card-bg)', color: 'var(--text-main)' }}
        >
          <option value="/docs/work ditribution.html">Work Distribution (HTML)</option>
          <option value="/docs/GDG Management Portal - Modular Monolith Task Allocation.pdf">Modular Monolith Task Allocation (PDF)</option>
        </select>
      </div>
      
      {selectedDoc ? (
        <iframe src={selectedDoc} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', width: '100%', minHeight: '60vh', background: 'white' }} title="Work Distribution"></iframe>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', padding: '20px', border: '2px dashed var(--border)', borderRadius: '8px', minHeight: '60vh' }}>
          Please select a document from the dropdown above.
        </div>
      )}
    </div>
  );
};

export default WorkDistribution;
