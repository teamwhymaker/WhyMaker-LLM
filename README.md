# WhyMaker Internal Chatbot

The WhyMaker AI chatbot provides instant, intelligent answers to questions about WhyMaker by searching through our internal knowledge base and generating contextual responses.

## 🎯 Purpose

This chatbot serves as WhyMaker's internal AI assistant, helping team members and users quickly find information from our documentation, policies, procedures, and other company resources. It's designed to reduce the time spent searching through documents and provide consistent, accurate answers.

## 🏗️ How It Works

### **Knowledge Base**
- **Source**: Company documents stored in Google Drive
- **Content**: Product documentation, policies, procedures, FAQs, and other internal resources
- **Updates**: Automatically syncs with Drive folder changes (indexed daily)

### **Search & Retrieval**
- **Technology**: Google Cloud Vertex AI Search (Enterprise Search)
- **Process**: When you ask a question, the system semantically searches through all indexed documents
- **Intelligence**: Finds relevant information even when your question doesn't use exact keywords from the documents

### **Answer Generation**
- **AI Model**: OpenAI GPT (configurable between Fast and Smart modes)
- **Context**: Uses the most relevant document snippets as context for generating answers
- **Accuracy**: Responses are grounded in actual company documents, not general AI knowledge

### **Interface**
- **Platform**: Modern web interface accessible via browser
- **Features**: Real-time chat, conversation history, source citations
- **Access**: Available at `chatbot.whymaker.com` (or internal Vercel URL)

## 🔧 Technical Architecture

### **Frontend**
- **Framework**: Next.js 15 with React 18
- **Hosting**: Vercel (serverless)
- **UI**: Responsive design with chat interface

### **Backend**
- **API**: Serverless Next.js API routes (no separate backend server)
- **Integration**: Direct connection to Google Cloud and OpenAI APIs
- **Authentication**: Optional Google OAuth for accessing private documents

### **Infrastructure**
- **Search Engine**: Google Cloud Vertex AI Search
- **AI Provider**: OpenAI API
- **Document Storage**: Google Drive (automatically indexed)
- **Deployment**: Vercel with custom domain support

## 📊 Capabilities

### **What It Can Do**
- Answer questions about WhyMaker products and services
- Explain company policies and procedures
- Help find specific information from documentation
- Provide consistent answers across team members
- Search through multiple document types (PDFs, Word docs, Google Docs)
- Maintain conversation context for follow-up questions

### **What It Knows**
The chatbot has access to information from:
- Product documentation and specifications
- Company policies and procedures
- Support documentation and FAQs
- Training materials
- Any documents added to the connected Drive folder

### **Limitations**
- **Knowledge Cutoff**: Only knows information from indexed documents
- **Update Delay**: New documents take 24-48 hours to be searchable
- **Document Quality**: Answers are only as good as the source documents
- **No External Data**: Cannot access information outside the knowledge base

## 🚀 Usage

### **Accessing the Chatbot**
- **URL**: `chatbot.whymaker.com` (or internal development URL)
- **Requirements**: Modern web browser, internet connection
- **Authentication**: Optional (for accessing private documents)

### **Best Practices**
- **Be Specific**: Ask clear, specific questions for better results
- **Use Context**: Provide context when asking follow-up questions
- **Check Sources**: Review cited sources to verify information
- **Report Issues**: Let the team know if answers seem incorrect or outdated

### **Example Questions**
- "What is WhyMaker's refund policy?"
- "How do I configure the new product feature?"
- "What are the system requirements for our software?"
- "Who should I contact for technical support issues?"

## 🔄 Maintenance

### **Content Updates**
- **Automatic**: Documents added to the Drive folder are automatically indexed
- **Manual**: Team can trigger re-indexing if needed
- **Monitoring**: System logs track indexing status and search performance

### **Document Management**
- **Organization**: Documents can be organized in folders within Drive
- **Formats**: Supports PDFs, Word documents, Google Docs, and text files
- **Access Control**: Respects Google Drive permissions and sharing settings

## 📈 Performance

### **Response Times**
- **Typical**: 2-5 seconds for most queries
- **Factors**: Document complexity, query complexity, model selection
- **Optimization**: Fast mode for quicker responses, Smart mode for complex questions

### **Accuracy**
- **Source-Based**: All answers are grounded in actual company documents
- **Citations**: Provides source references for verification
- **Consistency**: Same question yields consistent answers over time

## 🛠️ Technical Details

### **Integration Points**
- **Google Drive**: Document source and automatic syncing
- **Vertex AI**: Semantic search and document indexing
- **OpenAI**: Natural language generation and conversation
- **Vercel**: Hosting and deployment platform

### **Environment Variables**
Configure these environment variables in your Vercel project settings:

#### **Required Variables**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud Vertex AI Search
VERTEX_PROJECT_ID=your_gcp_project_id
VERTEX_LOCATION=global
GCP_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Google OAuth (for authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback
```

#### **Vertex AI Search Configuration (choose one)**
```bash
# Option 1: Use Data Store ID
VERTEX_DATA_STORE_ID=your_datastore_id

# Option 2: Use Engine ID (if you created an App/Engine)
VERTEX_ENGINE_ID=your_engine_id

# Option 3: Use full Serving Config path (most explicit)
VERTEX_SERVING_CONFIG=projects/PROJECT_ID/locations/LOCATION/collections/default_collection/dataStores/DATASTORE_ID/servingConfigs/default_search
```

#### **Optional Variables**
```bash
# Language configuration (defaults to en-US)
VERTEX_LANGUAGE_CODE=en-US

# Public variables (if needed for frontend)
NEXT_PUBLIC_SITE_NAME=WhyMaker Chatbot
```

### **Security**
- **Authentication**: Optional OAuth integration
- **Data Privacy**: All data stays within WhyMaker's control
- **Access Control**: Respects existing document permissions

## 📞 Support

For technical issues, content updates, or feature requests, contact the WhyMaker development team.

**Current Status**: ✅ Active and maintained

---

*This chatbot represents WhyMaker's commitment to making information accessible and helping our team work more efficiently.*