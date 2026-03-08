import Link from 'next/link';
import { blogPosts } from '@/data/blog-posts';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-10 text-center">
          📝 GemBots Blog
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300 transform hover:-translate-y-1 shadow-lg">
                <p className="text-gray-400 text-sm mb-2">{post.date}</p>
                <h2 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  {post.title}
                </h2>
                <p className="text-gray-300 text-base mb-4 line-clamp-3">
                  {post.content.split('\n')[0]} {/* Simple summary for now */}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
