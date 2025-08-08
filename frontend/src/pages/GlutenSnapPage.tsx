import React, { useState, useRef, useEffect } from 'react';
import * as api from '../api';
import { useUser } from '../context/UserContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PhotoHistory {
  id: string;
  imagePreview: string;
  result: api.GlutenScanResult;
  timestamp: Date;
}

/**
 * GlutenSnapPage with AI-powered food analysis, interactive chat, and photo history.
 */
const GlutenSnapPage: React.FC = () => {
  const { user } = useUser();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<api.GlutenScanResult | null>(null);
  const [photoHistory, setPhotoHistory] = useState<PhotoHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PhotoHistory | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  
  // Chat state
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load photo history from localStorage on component mount
  useEffect(() => {
    if (!user) return;
    
    const historyKey = `gluten-snap-history-${user.user_id}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setPhotoHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load photo history:', error);
      }
    }
  }, [user]);

  // Save photo history to localStorage
  const savePhotoHistory = (history: PhotoHistory[]) => {
    if (!user) return;
    
    try {
      const historyKey = `gluten-snap-history-${user.user_id}`;
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save photo history:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAnalysisResult(null);
    setError('');
    setShowChat(false);
    setChatMessages([]);
    
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please choose an image');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('Unexpected reader result'));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(imageFile);
      });
      
      const response = await api.createGlutenScan({ image_data: base64 });
      setAnalysisResult(response);
      
      // Save to history
      const historyItem: PhotoHistory = {
        id: Date.now().toString(),
        imagePreview: base64,
        result: response,
        timestamp: new Date()
      };
      
      const updatedHistory = [historyItem, ...photoHistory].slice(0, 20); // Keep last 20 items
      setPhotoHistory(updatedHistory);
      savePhotoHistory(updatedHistory);
      
      // Auto-open chat with welcome message
      setTimeout(() => {
        setShowChat(true);
        setChatMessages([{
          role: 'assistant',
          content: `I've analyzed your food image! ${response.analysis ? 'Feel free to ask me any questions about the ingredients, gluten content, or alternatives. How can I help you?' : 'What would you like to know about this food?'}`,
          timestamp: new Date()
        }]);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || chatLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setChatLoading(true);
    
    try {
      const context = analysisResult?.analysis || '';
      const response = await api.sendFoodChatMessage({
        message: userMessage.content,
        context: context
      });
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const handleHistoryClick = (historyItem: PhotoHistory) => {
    setSelectedHistoryItem(historyItem);
    setAnalysisResult(historyItem.result);
    setImagePreview(historyItem.imagePreview);
    setImageFile(null);
    setShowChat(false);
    setChatMessages([]);
  };

  const handleDeleteScan = async (scanId: number) => {
    try {
      await api.deleteGlutenScan(scanId);
      // Remove from local photo history as well
      const updated = photoHistory.filter((h) => h.result.id !== scanId);
      setPhotoHistory(updated);
      savePhotoHistory(updated);
      if (selectedHistoryItem?.result.id === scanId) {
        setSelectedHistoryItem(null);
        setAnalysisResult(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-black mb-2">🔍 AI-Powered Gluten Snap</h1>
      </div>
      
      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-black mb-4">Upload Food Image</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2" htmlFor="image">
              Choose a photo of your food
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {imagePreview && (
            <div className="mt-4">
              <img 
                src={imagePreview} 
                alt="Food preview" 
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            disabled={loading || !imageFile}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Food...
              </span>
            ) : '🔍 Analyze Food'}
          </button>
        </form>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-black mb-2">🍽️ Analysis Results</h3>
            <p className="font-medium text-black">{analysisResult.result_tag}</p>
            
            {analysisResult.confidence && (
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  analysisResult.confidence === 'high' ? 'bg-blue-100 text-blue-800' :
                  analysisResult.confidence === 'medium' ? 'bg-gray-100 text-gray-800' :
                  'bg-black text-white'
                }`}>
                  {analysisResult.confidence} confidence
                </span>
              </div>
            )}
          </div>
          
          {analysisResult.analysis && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-black mb-2">📋 Detailed Analysis</h4>
              <p className="text-sm text-black whitespace-pre-wrap">{analysisResult.analysis}</p>
            </div>
          )}
          
          {analysisResult.gluten_assessment && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h4 className="font-medium text-blue-800 mb-1">🌾 Gluten Assessment</h4>
              <p className="text-blue-700 text-sm">{analysisResult.gluten_assessment}</p>
            </div>
          )}

          {/* Chat Interface */}
          {showChat ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-black">💬 Chat about your food</h3>
                <button 
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Chat Messages */}
              <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto mb-4">
                <div className="space-y-3">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
              
              {/* Chat Input */}
              <div className="flex space-x-2">
                <textarea 
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about ingredients, gluten content, alternatives..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  disabled={chatLoading}
                />
                <button 
                  onClick={sendChatMessage}
                  disabled={chatLoading || !currentMessage.trim()}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  📤
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button 
                onClick={() => setShowChat(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                💬 Chat about this food
              </button>
            </div>
          )}
        </div>
      )}

      {/* Photo History */}
      {photoHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-black mb-4">📸 Recent Photos</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photoHistory.map((item) => (
              <div key={item.id} className="aspect-square relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors">
                <button
                  onClick={() => handleHistoryClick(item)}
                  className="absolute inset-0 w-full h-full"
                  aria-label="Open photo"
                />
                <img 
                  src={item.imagePreview} 
                  alt="Food history" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                  {item.timestamp.toLocaleDateString()}
                </div>
                {selectedHistoryItem?.id === item.id && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg pointer-events-none"></div>
                )}
                {/* Delete button */}
                <button
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.result.id as any); }}
                  aria-label="Delete photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId != null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-lg shadow-lg p-4 w-[320px]" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-black font-medium mb-2">Delete this photo?</div>
            <div className="text-xs text-gray-600 mb-4">This will remove the scan from your history. This action cannot be undone.</div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="px-3 py-1 text-xs rounded bg-red-600 text-white" onClick={() => handleDeleteScan(confirmDeleteId!)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlutenSnapPage;