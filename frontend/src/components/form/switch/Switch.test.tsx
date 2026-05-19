import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Switch from './Switch';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Switch', () => {
  it('renders with label', () => {
    render(<Switch label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders as unchecked by default', () => {
    render(<Switch label="Toggle" />);
    const checkbox = screen.getByRole('switch');
    expect(checkbox).not.toBeChecked();
  });

  it('renders as checked when defaultChecked is true', () => {
    render(<Switch label="Toggle" defaultChecked />);
    const checkbox = screen.getByRole('switch');
    expect(checkbox).toBeChecked();
  });

  it('toggle changes state on click', async () => {
    const user = userEvent.setup();
    render(<Switch label="Toggle" />);
    const checkbox = screen.getByRole('switch');

    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('calls onChange with new state on toggle', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch label="Toggle" onChange={onChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not toggle with Enter key', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch label="Toggle" onChange={onChange} />);
    const checkbox = screen.getByRole('switch');

    checkbox.focus();
    expect(checkbox).not.toBeChecked();
    await user.keyboard('{Enter}');
    expect(checkbox).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles with Space key', async () => {
    const user = userEvent.setup();
    render(<Switch label="Toggle" />);
    const checkbox = screen.getByRole('switch');

    checkbox.focus();
    expect(checkbox).not.toBeChecked();
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
  });

  it('disabled state prevents toggle', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch label="Toggle" disabled onChange={onChange} />);
    const checkbox = screen.getByRole('switch');

    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled switch does not respond to keyboard', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch label="Toggle" disabled onChange={onChange} />);
    const checkbox = screen.getByRole('switch');

    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies custom id', () => {
    render(<Switch label="Toggle" id="custom-id" />);
    const checkbox = screen.getByRole('switch');
    expect(checkbox).toHaveAttribute('id', 'custom-id');
  });

  it('applies name attribute', () => {
    render(<Switch label="Toggle" name="my-switch" />);
    const checkbox = screen.getByRole('switch');
    expect(checkbox).toHaveAttribute('name', 'my-switch');
  });

  it('label is associated with input via htmlFor', () => {
    render(<Switch label="Notifications" id="notif-switch" />);
    const label = screen.getByText('Notifications');
    expect(label).toHaveAttribute('for', 'notif-switch');
  });
});
