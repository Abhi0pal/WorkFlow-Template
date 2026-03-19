# AI-Powered SRS Generator

An intelligent application that extracts structured Software Requirements Specification (SRS) data from documents (PDF/TXT) using Gemini AI.

## 🚀 Tech Stack

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **AI Engine:** [Google Gemini 3 Flash](https://ai.google.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Motion](https://motion.dev/) (formerly Framer Motion)
- **Icons:** [Lucide React](https://lucide.dev/)

## 📦 Key Dependencies

- `@google/genai`: Official SDK for Google's Generative AI models.
- `lucide-react`: Beautiful & consistent icons.
- `motion`: Production-ready animations for React.
- `tailwind-merge` & `clsx`: Utilities for efficient Tailwind class management.

## 🛠️ Implementation Details

### 1. AI-Native Extraction
The application leverages Gemini's native multimodal capabilities. Instead of using local PDF parsers, it sends the PDF binary data directly to the Gemini model. This allows for superior extraction of complex layouts and structured data.

### 2. Structured Data Schema
We use `responseSchema` and `responseMimeType: "application/json"` to ensure the AI returns a strictly typed JSON object that matches our SRS requirements.

### 3. SRS Transformation
Extracted data is passed through a transformation layer (`transformToTemplate`) that maps raw AI output into a standardized, generic SRS template format suitable for professional use.

### 4. Client-Side Processing
To ensure maximum responsiveness and security in the AI Studio environment, all AI calls are handled on the client side using the `NEXT_PUBLIC_GEMINI_API_KEY`.

## 💻 Local Setup & Development

Follow these steps to run the project on your local machine:

### 1. Prerequisites
- Node.js 18.x or higher
- npm or yarn
- A Google Gemini API Key (Get one at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Clone the Repository
```bash
# Download or clone the project
git clone <repository-url>
cd ai-studio-applet
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env.local` file in the root directory and add your Gemini API key:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### 6. Build for Production
```bash
npm run build
npm start
```

## 📄 License
This project is provided as-is for demonstration and development purposes.
