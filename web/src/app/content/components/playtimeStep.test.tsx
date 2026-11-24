import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import AddLogDialog from './AddLogDialog';
import PlaytimeControl from './actions/PlaytimeControl';

const translate = (key: string) => key;

vi.mock('next-intl', () => ({ useTranslations: () => translate }));
vi.mock('@/components/molecules/UserSearchInput', () => ({ UserSearchInput: () => null }));

function renderPlaytimeControl() {
  function Display() {
    const [minutes, setMinutes] = useState(55);
    return (
      <PlaytimeControl
        t={translate}
        localPlaytime={minutes}
        playtimeMinutes={55}
        setLocalPlaytime={setMinutes}
        handlePlaytimeChange={setMinutes}
      />
    );
  }
  render(<Display />);
}

function renderLogDialog() {
  render(
    <AddLogDialog
      isOpen
      contentType="game"
      initialData={{ playtime_minutes: 55 }}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />
  );
}

it.each([
  ['game actions', renderPlaytimeControl],
  ['log dialog', renderLogDialog],
] as const)('supports modifier clicks and keyboard shortcuts in %s', (_, renderEditor) => {
  renderEditor();
  const [hours, minutes] = screen.getAllByRole('spinbutton');
  const [subtractHours, addHours] = within(hours.parentElement!).getAllByRole('button');
  const [, addMinutes] = within(minutes.parentElement!).getAllByRole('button');

  fireEvent.click(addHours, { shiftKey: true });
  expect(hours).toHaveValue(100);
  fireEvent.click(subtractHours, { ctrlKey: true });
  expect(hours).toHaveValue(90);
  expect(minutes).toHaveValue(55);

  expect(fireEvent.keyDown(minutes, { key: '=', ctrlKey: true })).toBe(false);
  expect(hours).toHaveValue(91);
  expect(minutes).toHaveValue(5);
  fireEvent.keyDown(minutes, { key: '_', shiftKey: true });
  expect(hours).toHaveValue(89);
  expect(minutes).toHaveValue(25);

  fireEvent.keyDown(hours, { key: '+', ctrlKey: true, shiftKey: true });
  expect(hours).toHaveValue(99);
  fireEvent.keyDown(hours, { key: '-', shiftKey: true });
  expect(hours).toHaveValue(0);
  expect(minutes).toHaveValue(25);
  fireEvent.keyDown(minutes, { key: '-', shiftKey: true });
  expect(hours).toHaveValue(null);
  expect(minutes).toHaveValue(null);

  fireEvent.click(addMinutes);
  expect(minutes).toHaveValue(1);
});
