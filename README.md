# GuideAnts Chat Component Repository

This repository contains the source code for the `guideants-chat` web component, a framework-agnostic solution for embedding AI-powered conversations from [GuideAnts Notebooks](https://www.guideants.ai) into any website or application.

## 📂 Repository Structure

- **`client/`**: The core web component implementation (`guideants-chat`).
  - Contains source code, build configuration, and detailed documentation.
  - [Read Client Documentation](./client/README.md)
- **`harnesses/`**: Integration examples and test harnesses.
  - **`vanilla/`**: Plain HTML/JS implementation (primary test harness).
  - **`react/`**: React integration example.
  - **`angular/`**: Angular integration guide.
  - **`node-proxy/`**: Example of a Node.js proxy server.
- **`server/`**: Server-side components.
  - **`Guideants.Proxy/`**: ASP.NET Core proxy implementation.

## 🚀 Key Features

The `guideants-chat` component provides a rich set of features for embedding AI chat:

- **Framework Agnostic**: Works with React, Angular, Vue, or Vanilla JS.
- **Real-time Streaming**: Server-Sent Events (SSE) for instant responses.
- **Rich Content**: Markdown rendering, syntax highlighting, and Mermaid diagrams.
- **Authentication**: Supports anonymous access and secure webhook-based authentication.
- **Client-Side Tools**: Register local JavaScript functions for the AI to call.
- **Media Support**: Speech-to-text, camera capture, and file attachments.
- **Flexible UI**:
  - **Display Modes**: Full conversation or "Last Turn" mode.
  - **Collapsible**: Floating/collapsible chat interface.
  - **Theming**: Extensive CSS custom properties for styling.

## 📖 Documentation

Detailed documentation is available in the `client` directory:

- [**Main Documentation**](./client/README.md): Installation, API reference, and configuration.
- [**Implementation Summary**](./client/IMPLEMENTATION_SUMMARY.md): details on recent features like Last Turn mode and Collapsible UI.
- [**Styling Guide**](./client/STYLING.md): comprehensive guide to theming and CSS custom properties.

## 🛠️ Development & Testing

To build the client and run the test harnesses:

1.  **Build the Client**:
    ```bash
    cd client
    npm install
    npm run build
    ```

2.  **Run a Harness** (e.g., Vanilla):
    ```bash
    cd harnesses/vanilla
    node webhook-server.js
    ```
    Then open `http://localhost:5106` in your browser.

## 🔒 Server-Side Proxy

For secure deployments, you can route traffic through a server-side proxy to keep your API keys hidden.

- **Node.js/Express**: See `client/README.md#server-side-proxy` or check `harnesses/node-proxy`.
- **ASP.NET Core**: See `server/Guideants.Proxy/README.md`.

## 📄 License

Apache 2.0
