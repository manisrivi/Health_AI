export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>

          {/* Search Bar Skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(8)].map((_, i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {[...Array(8)].map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                          <div 
                            className={`h-4 bg-gray-200 rounded animate-pulse ${
                              colIndex === 0 ? 'w-3/4' :
                              colIndex === 2 ? 'w-2/3' :
                              colIndex === 3 || colIndex === 4 ? 'w-1/4' :
                              colIndex === 5 ? 'w-1/3' :
                              colIndex === 6 ? 'w-1/3' :
                              'w-1/2'
                            }`}
                          ></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
