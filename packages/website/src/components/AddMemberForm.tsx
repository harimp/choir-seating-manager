import { useState, FormEvent } from 'react';
import { VoiceSection } from '../types';
import './AddMemberForm.scss';

interface AddMemberFormProps {
  onAdd: (name: string, voiceSection: VoiceSection) => void;
}

export const AddMemberForm = ({ onAdd }: AddMemberFormProps) => {
  const [name, setName] = useState('');
  const [voiceSection, setVoiceSection] = useState<VoiceSection>('Soprano');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), voiceSection);
      setName('');
    }
  };

  return (
    <form className="add-member-form" onSubmit={handleSubmit}>
      <h2>Add Choir Member</h2>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter member name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="voiceSection">Voice Section</label>
          <select
            id="voiceSection"
            value={voiceSection}
            onChange={(e) => setVoiceSection(e.target.value as VoiceSection)}
          >
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
        <button type="submit" className="btn btn-success">
          Add Member
        </button>
      </div>
    </form>
  );
};
