import Import from './Import';

export const metadata = {
  title: 'Import a CSV file',
  description: 'Mark the cards you own in one go, from a CSV file. Your file is read once and not kept.',
  robots: { index: false },
};

export default function ImportPage() {
  return <Import />;
}
