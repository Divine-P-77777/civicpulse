'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { 
  loadDocuments, 
  deleteDocument, 
  setActiveDocument 
} from '@/store/slices/documentsSlice';
import { 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader2,
  Search,
  
} from 'lucide-react';

export default function DocumentsPage() {
  const dispatch = useAppDispatch();
  const { documents, isLoading } = useAppSelector((state) => state.documents);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');

  useEffect(() => {
    dispatch(loadDocuments());
  }, [dispatch]);

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await dispatch(deleteDocument(documentId)).unwrap();
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'processing':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.processing_status === filterStatus;
    const matchesRisk = filterRisk === 'all' || 
      (doc.risk_assessment && doc.risk_assessment.overall_risk === filterRisk);
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <Layout>
      <div className="h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                <p className="text-gray-600">Manage and analyze your legal documents</p>
              </div>
              
              <div className="text-sm text-gray-500">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Search and filters */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                </select>
                
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 size={48} className="mx-auto text-primary-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No documents uploaded' : 'No documents match your filters'}
              </p>
              <p className="text-gray-600 mb-6">
                {documents.length === 0 
                  ? 'Upload your first legal document to get started with AI analysis'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {documents.length === 0 && (
                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Documents grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((document) => (
                  <div key={document.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <FileText size={24} className="text-primary-600 mr-3" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {document.filename}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(document.upload_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {getStatusIcon(document.processing_status)}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${document.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                            document.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            document.processing_status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}
                        `}>
                          {document.processing_status}
                        </span>
                      </div>

                      {/* Risk assessment */}
                      {document.risk_assessment && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Risk Assessment</span>
                            <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${getRiskColor(document.risk_assessment.overall_risk)}
                            `}>
                              {document.risk_assessment.overall_risk}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {document.risk_assessment.risky_clauses_count} risky clause{document.risk_assessment.risky_clauses_count !== 1 ? 's' : ''} found
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => dispatch(setActiveDocument(document))}
                            className="flex items-center px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} className="mr-1" />
                            View
                          </button>
                          
                          <button className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <Download size={16} className="mr-1" />
                            Download
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Statistics</h3>
                
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {documents.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Documents</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {documents.filter(d => d.processing_status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">Analyzed</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {documents.filter(d => d.risk_assessment?.overall_risk === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">High Risk</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {documents.filter(d => d.risk_assessment?.overall_risk === 'medium').length}
                    </div>
                    <div className="text-sm text-gray-600">Medium Risk</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}