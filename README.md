# WhyMaker-LLM

## Getting Started

### Backend (API)

1. (Optional) Create and activate a virtual environment:
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```sh
   pip install -r requirements.txt uvicorn[standard]
   ```
3. Set up your `.env` file with your OpenAI API key:
   ```env
   OPENAI_API_KEY=your-key-here
   ```
4. Start the FastAPI backend:
   ```sh
   uvicorn api:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend (Next.js)

1. Change to the frontend directory:
   ```sh
   cd whymaker-chatbot-interface
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
   Or, if you use pnpm:
   ```sh
   pnpm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
   Or, with pnpm:
   ```sh
   pnpm dev
   ```

The frontend will typically be available at [http://localhost:3000](http://localhost:3000).