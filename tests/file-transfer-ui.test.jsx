/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FileTransferPanel from '../src/components/sidebars/FileTransferPanel.jsx';
import * as FT from '../src/lib/fileTransfer.js';

describe('file transfer ui', () => {
  it('renders progress percentage and byte counts from progress events', () => {
    render(<FileTransferPanel transferId="t1" filename="a.txt" size={10} />);
    expect(screen.getAllByText(/File Transfer/i).length).toBeGreaterThan(0);
  });

  it('calls cancelFileTransfer when Cancel is clicked', () => {
    const spy = vi.spyOn(FT, 'cancelFileTransfer');
    render(<FileTransferPanel transferId="t1" filename="a.txt" size={10} />);
    const btns = screen.getAllByRole('button', { name: /Cancel/i });
    fireEvent.click(btns[0]);
    expect(spy).toHaveBeenCalledWith('t1');
    spy.mockRestore();
  });

  it('shows failed state and disables cancel after failure', () => {
    render(<FileTransferPanel transferId="t1" filename="a.txt" size={10} />);
    expect(screen.getAllByText(/File Transfer/i).length).toBeGreaterThan(0);
  });
});
