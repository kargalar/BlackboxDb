/** Simple star rating display component */
export default function StarRating({
  rating,
  size = 'w-4 h-4',
}: {
  rating: number;
  size?: string;
}) {
  const stars = [];
  for (let i = 1; i <= 10; i++) {
    stars.push(
      <svg
        key={i}
        className={`${size} ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
        viewBox="0 0 20 20"
      >
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
      </svg>
    );
  }
  return <div className="flex items-center space-x-0.5">{stars}</div>;
}
