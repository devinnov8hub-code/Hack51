export function formatDate(dateString:string){
    const date = dateString.split("T")[0]
    return date;
}
export const badgeClasses = (status: string) => {
  const key = status.toLowerCase();
  switch (true) {
    case key.includes("published"):
      return "bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
   case key.includes("under_review"):
      return "bg-yellow-100 text-yellow-800 border border-yellow-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
    case key.includes("shortlist" ):
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200";
      case key.includes("shortlisted"):
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200";
    case key.includes("Delivered"):
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200";
      case key.includes("submitted"):
       return "bg-pink-100 text-pink-800 border border-pink-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
    case key.includes("scored"):
      return "bg-green-100 text-green-800 border border-green-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
      case key.includes("draft"):
      return "bg-gray-100 text-gray-800 border border-gray-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
      case key.includes("rejected"):
      return "bg-red-200 text-red-500 border border-red-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
    case key.includes("closed"):
      return "bg-gray-200 text-gray-500 border border-gray-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
  }
};

// const badgeClassesd = (status: SubmissionStatus) => {
//   const key = status.toLowerCase();
//   switch (true) {
//     case key.includes("under_review"):
//       return "bg-blue-100 text-blue-800";
//     case key.includes("evaluation"):
//     case key.includes("submitted"):
//       return "bg-yellow-100 text-yellow-800";
//     case key.includes("scored"):
//       return "bg-green-100 text-green-800";
//     case key.includes("draft"):
//       return "bg-gray-100 text-gray-800";
//     case key.includes("rejected"):
//       return "bg-red-200 text-red-500";
//     default:
//       return "bg-gray-100 text-gray-800";
//   }
// };