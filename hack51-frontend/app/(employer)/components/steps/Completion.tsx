type CompletionProps = {
  icon: React.ReactNode;
  title: string;
  text: string;
};

export default function Completion({ icon, title, text }: CompletionProps) {
  return (
    <div className="bg-overlay">
      <div className="bg-white p-8 rounded-xl shadow-md w-full mt-8 md:w-3/4 mx-auto text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{text}</p>
      </div>
    </div>
  );
}
