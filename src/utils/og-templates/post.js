import satori from "satori";
// import { html } from "satori-html";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

// const markup = html`<div
//       style={{
//         background: "#fefbfb",
//         width: "100%",
//         height: "100%",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <div
//         style={{
//           position: "absolute",
//           top: "-1px",
//           right: "-1px",
//           border: "4px solid #000",
//           background: "#ecebeb",
//           opacity: "0.9",
//           borderRadius: "4px",
//           display: "flex",
//           justifyContent: "center",
//           margin: "2.5rem",
//           width: "88%",
//           height: "80%",
//         }}
//       />

//       <div
//         style={{
//           border: "4px solid #000",
//           background: "#fefbfb",
//           borderRadius: "4px",
//           display: "flex",
//           justifyContent: "center",
//           margin: "2rem",
//           width: "88%",
//           height: "80%",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//             margin: "20px",
//             width: "90%",
//             height: "90%",
//           }}
//         >
//           <p
//             style={{
//               fontSize: 72,
//               fontWeight: "bold",
//               maxHeight: "84%",
//               overflow: "hidden",
//             }}
//           >
//             {post.data.title}
//           </p>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               width: "100%",
//               marginBottom: "8px",
//               fontSize: 28,
//             }}
//           >
//             <span>
//               by{" "}
//               <span
//                 style={{
//                   color: "transparent",
//                 }}
//               >
//                 "
//               </span>
//               <span style={{ overflow: "hidden", fontWeight: "bold" }}>
//                 {post.data.author}
//               </span>
//             </span>

//             <span style={{ overflow: "hidden", fontWeight: "bold" }}>
//               {SITE.title}
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>`;

export default async (post, options = {}) => {
  const width = options.width ?? 1200;
  const height = options.height ?? 630;
  const isSquare = Math.abs(width - height) < 20;
  const padding = isSquare ? 56 : 48;
  const titleSize = isSquare ? 82 : 68;
  const footerSize = isSquare ? 34 : 28;

  return satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #f8f5ef 0%, #eee9df 100%)",
          color: "#171717",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                border: "10px solid #1f2937",
                opacity: 0.08,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: isSquare ? 24 : 20,
                right: isSquare ? 24 : 20,
                display: "flex",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(17,24,39,0.9)",
                color: "#f9fafb",
                fontSize: isSquare ? 24 : 20,
                fontWeight: 700,
              },
              children: "Frevia",
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                width: "100%",
                height: "100%",
                padding: `${padding}px`,
                flexDirection: "column",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: isSquare ? 26 : 22,
                      color: "#334155",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            width: isSquare ? "14px" : "12px",
                            height: isSquare ? "14px" : "12px",
                            borderRadius: 9999,
                            background: "#0f766e",
                          },
                        },
                      },
                      "Frevia's Notes",
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: isSquare ? "20px" : "14px",
                    },
                    children: [
                      {
                        type: "p",
                        props: {
                          style: {
                            margin: 0,
                            fontSize: titleSize,
                            lineHeight: 1.2,
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            maxHeight: isSquare ? "72%" : "62%",
                            overflow: "hidden",
                          },
                          children: post.data.title,
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: footerSize,
                      color: "#334155",
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: { display: "flex", fontWeight: 700 },
                          children: post.data.author ?? SITE.author,
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: { display: "flex", fontWeight: 700 },
                          children: SITE.title,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width,
      height,
      embedFont: true,
      fonts: await loadGoogleFonts(
        post.data.title + (post.data.author ?? SITE.author) + SITE.title
      ),
    }
  );
};
