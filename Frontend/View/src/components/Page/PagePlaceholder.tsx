type PagePlaceholderProps = {
  title: string;
};

function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <section style={{ padding: '2rem 0', textAlign: 'center' }}>
      <h2>{title}</h2>
    </section>
  );
}

export default PagePlaceholder;
