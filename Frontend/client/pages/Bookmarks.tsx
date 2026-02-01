import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageCircle, Calendar, Star, Film, BookOpen, Tv } from "lucide-react";
import { contentApi } from "@/lib/content-api";
import { TokenManager } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BookmarkItem {
  id: string;
  title: string;
  type: 'movie' | 'book' | 'show' | 'post';
  description: string;
  rating?: number;
  year?: string;
  genre?: string;
  author?: string;
  createdAt: string;
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const filters = [
    { id: "all", label: "All", icon: Heart },
    { id: "movie", label: "Movies", icon: Film },
    { id: "book", label: "Books", icon: BookOpen },
    { id: "show", label: "Shows", icon: Tv },
    { id: "post", label: "Posts", icon: MessageCircle }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      loadBookmarks();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterBookmarks();
  }, [bookmarks, searchTerm, activeFilter]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      
      // Fetch all posts
      const postsResponse = await contentApi.getPosts();
      const allPosts = postsResponse.posts || postsResponse;
      
      // Check which posts are liked
      const likedPostsPromises = allPosts.map(async (post: any) => {
        try {
          const response = await fetch(`http://localhost:8082/posts/${post.postId}/liked`, {
            headers: {
              'Authorization': `Bearer ${TokenManager.getToken()}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const isLiked = await response.json();
            return isLiked ? post : null;
          }
        } catch (error) {
          console.error(`Failed to check like status for post ${post.postId}:`, error);
        }
        return null;
      });
      
      const likedPostsResults = await Promise.all(likedPostsPromises);
      const likedPosts = likedPostsResults.filter(post => post !== null);
      
      const bookmarkItems: BookmarkItem[] = likedPosts.map((post: any) => {
        let content;
        try {
          content = JSON.parse(post.content);
        } catch {
          content = {};
        }
        
        return {
          id: post.postId || post.id,
          title: post.title,
          type: post.category || 'post',
          description: content.description || post.content || 'No description available',
          rating: post.averageRating,
          year: content.year,
          genre: content.genre,
          author: content.author,
          createdAt: post.createdAt || new Date().toISOString()
        };
      });
      
      setBookmarks(bookmarkItems);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      toast({ title: "Failed to load bookmarks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterBookmarks = () => {
    let filtered = bookmarks;

    if (activeFilter !== "all") {
      if (activeFilter === "post") {
        filtered = filtered.filter(item => item.type === "general");
      } else {
        filtered = filtered.filter(item => item.type === activeFilter);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.genre && item.genre.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredBookmarks(filtered);
  };

  const removeBookmark = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8082/posts/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setBookmarks(prev => prev.filter(item => item.id !== id));
        toast({ title: "Bookmark removed" });
      } else {
        throw new Error('Failed to remove bookmark');
      }
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      toast({ title: "Failed to remove bookmark", variant: "destructive" });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="w-5 h-5" />;
      case 'book': return <BookOpen className="w-5 h-5" />;
      case 'show': return <Tv className="w-5 h-5" />;
      default: return <MessageCircle className="w-5 h-5" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-media-frozen-water via-white to-media-pearl-aqua/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-media-dark-raspberry mb-4">Please Login</h2>
          <p className="text-media-dark-raspberry/70">You need to be logged in to view your bookmarks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-media-frozen-water via-white to-media-pearl-aqua/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-media-dark-raspberry mb-6">
            My Bookmarks
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-media-dark-raspberry/50" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-media-frozen-water focus:border-media-pearl-aqua focus:ring-2 focus:ring-media-pearl-aqua/20 focus:outline-none smooth-all text-lg"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white/70 backdrop-blur-sm rounded-2xl p-6 h-fit sticky top-6">
            <h3 className="text-lg font-semibold text-media-dark-raspberry mb-4">Filter by Type</h3>
            <div className="space-y-2">
              {filters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      activeFilter === filter.id
                        ? "bg-gradient-to-r from-media-pearl-aqua to-media-powder-blush text-white shadow-lg"
                        : "text-media-dark-raspberry hover:bg-media-frozen-water/50 hover:shadow-md"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{filter.label}</span>
                    <span className="ml-auto text-xs bg-media-dark-raspberry/10 px-2 py-1 rounded-full">
                      {filter.id === "all" 
                        ? bookmarks.length 
                        : filter.id === "post"
                        ? bookmarks.filter(item => item.type === "general").length
                        : bookmarks.filter(item => item.type === filter.id).length
                      }
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-media-berry-crush mx-auto mb-4"></div>
                <p className="text-media-dark-raspberry/70">Loading bookmarks...</p>
              </div>
            ) : filteredBookmarks.length > 0 ? (
              <div className="grid gap-6">
                {filteredBookmarks.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => {
                    if (item.type === 'movie') navigate(`/movie/${item.id}`);
                    else if (item.type === 'book') navigate(`/book/${item.id}`);
                    else if (item.type === 'show') navigate(`/show/${item.id}`);
                  }}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-media-berry-crush to-media-dark-raspberry flex items-center justify-center text-white">
                            {getTypeIcon(item.type)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-media-dark-raspberry">{item.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-media-dark-raspberry/70 mt-1">
                              <span className="px-2 py-1 rounded-full bg-media-pearl-aqua/20 text-media-dark-raspberry text-xs font-semibold capitalize">
                                {item.type}
                              </span>
                              {item.year && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {item.year}
                                </div>
                              )}
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-media-powder-blush text-media-powder-blush" />
                                  {item.rating.toFixed(1)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmark(item.id);
                          }}
                          className="p-2 rounded-full text-media-berry-crush hover:bg-media-berry-crush hover:text-white transition-all"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                      
                      <p className="text-media-dark-raspberry/80 mb-4">{item.description}</p>
                      
                      {item.author && (
                        <p className="text-sm text-media-dark-raspberry/60">
                          <span className="font-medium">Author:</span> {item.author}
                        </p>
                      )}
                      
                      {item.genre && (
                        <p className="text-sm text-media-dark-raspberry/60">
                          <span className="font-medium">Genre:</span> {item.genre}
                        </p>
                      )}
                      
                      <p className="text-xs text-media-dark-raspberry/50 mt-3">
                        Bookmarked on {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-media-dark-raspberry/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-media-dark-raspberry mb-2">No bookmarks found</h3>
                <p className="text-media-dark-raspberry/70">
                  {searchTerm || activeFilter !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Start bookmarking your favorite content to see it here."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}