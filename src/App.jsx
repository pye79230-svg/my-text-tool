import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, FileText, Scissors, Copy, Check, Download, 
  RefreshCw, AlertCircle, Settings, Terminal, Github, 
  Code, FileJson, FileCode, AlignLeft, List, Cpu, Globe
} from 'lucide-react';

// 支持的文件类型映射图标
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'json': return <FileJson className="w-6 h-6 text-yellow-600" />;
    case 'js': 
    case 'ts': 
    case 'py': 
    case 'java': 
    case 'cpp': return <FileCode className="w-6 h-6 text-blue-600" />;
    case 'md': return <FileText className="w-6 h-6 text-slate-600" />;
    case 'html': 
    case 'xml': return <Code className="w-6 h-6 text-orange-600" />;
    default: return <AlignLeft className="w-6 h-6 text-slate-500" />;
  }
};

const TextSplitterPro = () => {
  // --- 状态管理 ---
  const [originalText, setOriginalText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  
  // 配置项
  const [splitMode, setSplitMode] = useState('length'); // 'length' | 'separator'
  const [chunkSize, setChunkSize] = useState(15000);
  const [separator, setSeparator] = useState(''); // 正则表达式
  const [encoding, setEncoding] = useState('utf-8'); 
  const [customPrompt, setCustomPrompt] = useState('>>> 当前分片 {current} / {total} <<<\n\n'); // 技术风默认提示
  
  // 处理状态
  const [chunks, setChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- 核心逻辑 ---

  // 文件读取
  const readFile = (file, enc) => {
    if (!file) return;
    
    // 严格类型检查
    const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'zip', 'rar', 'exe'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (binaryExts.includes(ext)) {
      setErrorMsg(`错误: 不支持 .${ext} 二进制格式。请仅使用文本类文件。`);
      return;
    }

    setFileName(file.name.replace(/\.[^/.]+$/, ""));
    setFileSize(file.size);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalText(e.target.result);
      setChunks([]); 
    };
    reader.onerror = () => setErrorMsg("IO错误: 文件流读取失败。");
    reader.readAsText(file, enc);
  };

  const handleFileUpload = (event) => {
    readFile(event.target.files?.[0], encoding);
  };

  const fileInputRef = useRef(null);
  useEffect(() => {
    if (fileInputRef.current?.files?.[0]) {
      readFile(fileInputRef.current.files[0], encoding);
    }
  }, [encoding]);

  // 分割引擎
  const performSplit = useCallback(() => {
    if (!originalText) return;

    setIsProcessing(true);
    
    // 异步执行避免阻塞主线程
    setTimeout(() => {
      try {
        const newChunks = [];
        
        if (splitMode === 'length') {
          // === 基于缓冲区的分割 ===
          let currentIndex = 0;
          const totalLength = originalText.length;
          
          while (currentIndex < totalLength) {
            let endIndex = Math.min(currentIndex + chunkSize, totalLength);
            
            // 智能断点检测 (支持多语言标点)
            if (endIndex < totalLength) {
              const searchWindow = originalText.slice(Math.max(currentIndex, endIndex - 500), endIndex);
              
              // 优先级：换行符 > 句号/问号/感叹号 (中日文) > 点/问号/感叹号 (英文)
              // 我们寻找窗口内最后一个出现的这些符号
              const delimiters = ['\n', '。', '！', '？', '.', '!', '?'];
              let bestSplitIndex = -1;
              
              for (const char of delimiters) {
                const lastIndex = searchWindow.lastIndexOf(char);
                if (lastIndex > bestSplitIndex) {
                  bestSplitIndex = lastIndex;
                  // 如果找到换行符，通常是最佳切分点，但为了安全我们遍历完或者设定优先级
                  // 这里简单处理：去最大的索引，通常意味着最接近末尾的句子结束
                }
              }

              if (bestSplitIndex !== -1) {
                // +1 是为了包含标点符号本身
                endIndex = Math.max(currentIndex, endIndex - 500) + bestSplitIndex + 1;
              }
            }

            newChunks.push(originalText.slice(currentIndex, endIndex));
            currentIndex = endIndex;
          }

        } else if (splitMode === 'separator') {
          // === 正则分割引擎 ===
          if (!separator) {
            newChunks.push(originalText);
          } else {
            try {
              const regex = new RegExp(`(${separator})`, 'g'); 
              const parts = originalText.split(regex);
              
              let buffer = '';
              parts.forEach(part => {
                 if (new RegExp(separator).test(part)) {
                    if (buffer) newChunks.push(buffer);
                    buffer = part; 
                 } else {
                    buffer += part;
                 }
              });
              if (buffer) newChunks.push(buffer);
              
              if (newChunks.length === 0 && originalText.length > 0) newChunks.push(originalText);

            } catch (e) {
               console.warn("正则编译失败，回退到字符串分割");
               const plainParts = originalText.split(separator);
               plainParts.forEach(p => newChunks.push(p));
            }
          }
        }
        
        setChunks(newChunks);
      } catch (err) {
        setErrorMsg("运行时错误: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  }, [originalText, chunkSize, splitMode, separator]);

  // --- 工具函数 ---

  const copyToClipboard = (text, index) => {
    // 头部信息注入逻辑
    const prompt = customPrompt
      .replace('{current}', index + 1)
      .replace('{total}', chunks.length);
    const content = `${prompt}${text}`;

    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const downloadChunk = (text, index) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_Part_${index + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrag = (e, status) => {
    e.preventDefault();
    setIsDragging(status);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (fileInputRef.current) fileInputRef.current.files = e.dataTransfer.files;
      readFile(file, encoding);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header: 简洁技术风 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-900 rounded-lg shadow-sm">
              <Terminal className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-mono">文本分片工具<span className="text-gray-500 text-lg ml-2">专业版</span></h1>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">本地运行 • 多语言支持 • 数据安全</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              v2.2.0-i18n
            </div>
            <a href="#" className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
              <Github className="w-4 h-4" />
              查看源码
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左侧：控制面板 */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 上传区域 */}
            <div 
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group bg-white
                ${isDragging ? 'border-gray-500 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
                ${originalText ? 'border-gray-400 bg-gray-50' : ''}
              `}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              
              {originalText ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center mx-auto">
                    {getFileIcon(fileName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 truncate px-2 font-mono text-sm">{fileName}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {formatSize(fileSize)} | {originalText.length.toLocaleString()} 字符
                    </p>
                  </div>
                  <div className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-[10px] uppercase font-bold tracking-wide rounded">
                    已加载
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto group-hover:bg-gray-200 transition-all">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">拖拽文件到此处</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">支持 .txt, .md, .json, .js 等</p>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs font-mono p-3 rounded border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 配置面板 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                  <Settings className="w-4 h-4" /> 配置参数
                </div>
                <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-gray-400" />
                    <select 
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-gray-500 font-mono w-32"
                    title="根据文件语言选择编码，解决乱码问题"
                    >
                    <option value="utf-8">UTF-8 (通用)</option>
                    <option value="gbk">GBK (简体中文)</option>
                    <option value="big5">Big5 (繁体中文)</option>
                    <option value="shift_jis">Shift_JIS (日文)</option>
                    <option value="euc-jp">EUC-JP (日文)</option>
                    <option value="euc-kr">EUC-KR (韩文)</option>
                    <option value="windows-1252">Windows-1252 (西欧)</option>
                    </select>
                </div>
              </div>
              
              <div className="p-5 space-y-6">
                
                {/* 模式切换 */}
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  <button 
                    onClick={() => setSplitMode('length')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${splitMode === 'length' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    按字数分割
                  </button>
                  <button 
                    onClick={() => setSplitMode('separator')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${splitMode === 'separator' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    按分隔符
                  </button>
                </div>

                {splitMode === 'length' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-600">单片字数限制</span>
                      <span className="font-mono text-blue-600">{chunkSize.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1000" 
                      max="50000" 
                      step="1000" 
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>1K</span>
                      <span>推荐值: 15K</span>
                      <span>50K</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600 block">自定义分隔符 (支持正则)</label>
                    <input 
                      type="text"
                      value={separator}
                      onChange={(e) => setSeparator(e.target.value)}
                      placeholder="例如: 第.+章"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 outline-none font-mono"
                    />
                  </div>
                )}

                {/* 头部注入 */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> 分片头部注入 (可选)
                    </span>
                  </div>
                  <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full h-20 text-xs p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 resize-none bg-gray-50 font-mono text-gray-600"
                    spellCheck={false}
                    placeholder="输入需要添加到每个分片开头的内容..."
                  />
                </div>

                <button 
                  onClick={performSplit}
                  disabled={!originalText || isProcessing}
                  className={`
                    w-full py-3 rounded-lg font-bold text-sm tracking-wide shadow-sm transition-all flex items-center justify-center gap-2
                    ${!originalText 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-black active:scale-95'}
                  `}
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                  {isProcessing ? '处理中...' : '执行分割'}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：输出结果 */}
          <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
              
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm tracking-wide">
                    <List className="w-4 h-4 text-gray-500" />
                    输出分片列表
                  </h2>
                  {chunks.length > 0 && (
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded font-mono font-bold">
                      数量: {chunks.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300">
                {chunks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-60">
                    <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl">
                      <Code className="w-12 h-12" />
                    </div>
                    <p className="font-mono text-sm">等待输入数据流...</p>
                  </div>
                ) : (
                  chunks.map((chunk, index) => (
                    <div 
                      key={index}
                      className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:border-gray-400 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-mono font-bold text-gray-400">
                            #{String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                            长度: {chunk.length.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => downloadChunk(chunk, index)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> .txt
                          </button>
                          <button 
                            onClick={() => copyToClipboard(chunk, index)}
                            className={`
                              px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5
                              ${copiedIndex === index 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-800 text-white hover:bg-gray-700'}
                            `}
                          >
                            {copiedIndex === index ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedIndex === index ? '已复制' : '复制内容'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="bg-[#1e1e1e] rounded p-3 text-xs text-gray-300 font-mono leading-relaxed h-28 overflow-hidden break-words whitespace-pre-wrap border border-gray-800">
                           <span className="text-gray-500 select-none mr-2">$</span>
                           {chunk.slice(0, 500)}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1e1e1e] to-transparent rounded-b pointer-events-none"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="py-8 text-center space-y-2">
          <p className="flex items-center justify-center gap-1.5 text-gray-400 text-xs font-mono">
            <Settings className="w-3 h-3" />
            仅在本地浏览器处理，无服务器端数据交互。
          </p>
        </footer>

      </div>
    </div>
  );
};

export default TextSplitterPro;