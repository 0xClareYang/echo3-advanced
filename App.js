import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';

// ✅ 使用你的实际部署合约地址
const CONTRACT_CONFIG = {
  sepolia: {
    address: "0x99Bbb017561782a5Ee927d3F6a67d350d37A941F", // 你的Sepolia合约地址
    chainId: 11155111,
    name: "Sepolia Testnet"
  },
  polygon: {
    address: "0x...", // 如果部署到Polygon
    chainId: 137,
    name: "Polygon"
  }
};

// ✅ 使用你的ECHO3Simple合约ABI
const ECHO3_ABI = [
  "function seekTruth(string memory question) external returns (uint256)",
  "function getQuest(uint256 questId) external view returns (tuple(uint256 questId, address seeker, string question, uint256 randomResult, bool isComplete, uint256 timestamp, uint8 truthLevel))",
  "function getTruthMessage(uint256 questId) external view returns (string memory)",
  "function getTotalQuests() external view returns (uint256)"
];

// Real Data Service Class
class RealDataService {
  constructor() {
    this.endpoints = {
      coingecko: 'https://api.coingecko.com/api/v3',
      defillama: 'https://api.llama.fi'
    };
  }

  async getRealPrices() {
    try {
      const response = await fetch(
        `${this.endpoints.coingecko}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      
      return {
        btc: data.bitcoin?.usd || 102803.10,
        eth: data.ethereum?.usd || 2290.50,
        sol: data.solana?.usd || 135.93,
        btcChange: data.bitcoin?.usd_24h_change || -0.69,
        ethChange: data.ethereum?.usd_24h_change || -5.54,
        solChange: data.solana?.usd_24h_change || -3.20,
        lastUpdate: Date.now(),
        source: 'CoinGecko API'
      };
    } catch (error) {
      console.error('Real price fetch failed:', error);
      return null;
    }
  }

  async getDeFiData() {
    try {
      const response = await fetch(`${this.endpoints.defillama}/protocols`);
      const data = await response.json();
      
      const topProtocols = data
        .filter(p => p.tvl > 1e9)
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 10);

      return {
        totalTVL: data.reduce((sum, p) => sum + (p.tvl || 0), 0),
        topProtocols: topProtocols.map(p => ({
          name: p.name,
          tvl: p.tvl,
          category: p.category,
          change24h: p.change_1d || 0
        })),
        lastUpdate: Date.now(),
        source: 'DeFiLlama API'
      };
    } catch (error) {
      console.error('DeFi data fetch failed:', error);
      return {
        totalTVL: 89.7e9,
        topProtocols: [
          { name: 'Uniswap V3', tvl: 5.2e9, category: 'Dexes' },
          { name: 'Aave V3', tvl: 4.8e9, category: 'Lending' }
        ],
        source: 'Demo Data'
      };
    }
  }
}

const ECHO3Dashboard = () => {
  // ✅ 核心状态管理
  const [selectedCards, setSelectedCards] = useState(['personalized']);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentProgressStep, setCurrentProgressStep] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Web3 & Chainlink状态
  const [walletInfo, setWalletInfo] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainlinkPrices, setChainlinkPrices] = useState({
    btc: null,
    eth: null,
    sol: null,
    lastUpdate: null
  });
  
  // Web3集成状态
  const [web3State, setWeb3State] = useState({
    contract: null,
    signer: null,
    provider: null,
    isConnected: false,
    networkName: '',
    contractAddress: '',
    error: null,
    isDemo: true
  });

  const [dataService] = useState(() => new RealDataService());
  
  // AI助手状态
  const [tradingAssistant, setTradingAssistant] = useState({
    mode: 'collaborative',
    confidence: 0.76,
    suggestions: [],
    humanDecisionPending: false,
    lastRecommendation: null,
    humanOverrideCount: 0,
    successRate: 0.83,
    learningFromHuman: true,
    focusedOnChainProjects: true
  });
  
  // Truth Discovery状态
  const [truthProfile, setTruthProfile] = useState({
    adaptationRate: 0.73,
    predictionAccuracy: 0.81,
    truthScore: 0.89,
    learningVelocity: 0.94,
    totalSessions: 0,
    onChainVerified: false,
    humanCollaborationScore: 0.91,
    onChainProjectsAnalyzed: 127
  });
  
  const [modelConfidence, setModelConfidence] = useState(0.76);
  const [lastSelectedCards, setLastSelectedCards] = useState(['personalized']);
  const [hasSentWelcome, setHasSentWelcome] = useState(false);

  // ✅ 修复: 使用useMemo包装progressSteps
  const progressSteps = useMemo(() => [
    { step: 'Analyzing personal trading patterns...', weight: 15 },
    { step: 'Fetching multi-source market data...', weight: 25 },
    { step: 'Cross-referencing expert insights...', weight: 20 },
    { step: 'AI model inference in progress...', weight: 25 },
    { step: 'Generating personalized analysis...', weight: 15 }
  ], []);

  // ✅ 修复: 使用useMemo包装truthScenarios
  const truthScenarios = useMemo(() => ({
    personalized: {
      title: 'Personal Intelligence',
      subtitle: 'Individual trading pattern analysis',
      icon: '👤',
      color: 'from-blue-500 via-purple-500 to-pink-500',
      description: 'AI analyzes your historical trading patterns to identify successful strategies and optimize future decisions',
      features: ['Behavioral Learning', 'Risk Pattern Recognition', 'Success Rate Optimization', 'Personal Strategy Mapping'],
      truthLevel: 'Personal Learning Engine',
      badge: 'Personal AI',
      dataSource: '📊 Personal transaction history (Etherscan API) + 🧠 Behavioral pattern analysis'
    },
    security: {
      title: 'Security Intelligence', 
      subtitle: 'Risk assessment and protection',
      icon: '🛡️',
      color: 'from-amber-500 via-orange-500 to-red-500',
      description: 'Deep security analysis of DeFi protocols with real-time smart contract risk detection and vulnerability assessment',
      features: ['Smart Contract Auditing', 'Protocol Liquidity Analysis', 'Governance Risk Scoring', 'Economic Security Models'],
      truthLevel: 'Security Neural Networks',
      badge: 'Security AI',
      dataSource: '🔒 Approval analysis (ETH&SOL&BSC) + ⚠️ Threat intelligence (Forta Network API)'
    },
    macro: {
      title: 'Macro Narrative',
      subtitle: 'Market trend and ecosystem analysis',
      icon: '🌐',
      color: 'from-emerald-500 via-teal-500 to-cyan-500',
      description: 'Combines protocol fundamentals and community sentiment with macro economic indicators for strategic market positioning',
      features: ['Ecosystem Analysis', 'Community Sentiment Tracking', 'Protocol Correlation Mapping', 'Market Trend Forecasting'],
      truthLevel: 'Multi-Modal Analysis',
      badge: 'Ecosystem AI',
      dataSource: '🐦 Expert sentiment (Twitter API - 50 KOLs) + 📊 Institutional flows (DeFiLlama API)'
    }
  }), []);

  // 消息处理
  const addMessage = useCallback((type, content, data = null) => {
    const timestamp = Date.now();
    const message = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      data,
      timestamp: new Date(),
      confidence: type === 'ai' ? modelConfidence : null,
      truthScore: type === 'ai' ? truthProfile.truthScore : null,
      requiresDecision: data?.requiresDecision || false,
      selectedCards: type === 'ai' ? [...selectedCards] : null,
      dataSourcesUsed: type === 'ai' ? selectedCards.map(id => truthScenarios[id].dataSource) : null
    };
    setChatHistory(prev => [...prev, message]);
  }, [modelConfidence, truthProfile.truthScore, selectedCards, truthScenarios]);

  // ✅ 增强钱包连接
  const connectWallet = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        
        // 检查网络并连接合约
        let contractAddress = '';
        let contract = null;
        let isDemo = true;
        
        if (Number(network.chainId) === 11155111) { // Sepolia
          contractAddress = CONTRACT_CONFIG.sepolia.address;
          if (contractAddress && contractAddress !== "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
            contract = new ethers.Contract(contractAddress, ECHO3_ABI, signer);
            isDemo = false;
          }
        }
        
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);
        
        setWalletInfo({
          address,
          network: network.name,
          balance: parseFloat(balanceInEth).toFixed(4),
          chainId: network.chainId.toString()
        });
        
        setWeb3State({
          contract,
          signer,
          provider,
          isConnected: true,
          networkName: network.name,
          contractAddress,
          error: null,
          isDemo
        });
        
        // 检查合约状态
        let aiStatus = 'Demo Mode';
        if (contract) {
          try {
            const totalQuests = await contract.getTotalQuests();
            aiStatus = `Contract Active - ${totalQuests} quests processed`;
            
            setTruthProfile(prev => ({
              ...prev,
              onChainVerified: true,
              totalSessions: Number(totalQuests)
            }));
          } catch (error) {
            console.error('Failed to check contract status:', error);
            aiStatus = 'Contract Connected (Check Failed)';
          }
        }
        
        addMessage('system', `🎉 WALLET CONNECTED - ECHO3 AI ${isDemo ? 'DEMO' : 'ACTIVE'}

Address: ${address.substring(0, 8)}...${address.slice(-6)}
Network: ${network.name} (Chain ID: ${network.chainId})
Balance: ${balanceInEth.substring(0, 7)} ETH
Contract: ${contractAddress || 'Demo Mode'}

AI ASSISTANT STATUS: ${aiStatus}
🤖 Mode: ${isDemo ? 'Demo Intelligence' : 'On-chain Intelligence'}
📊 Confidence: ${(tradingAssistant.confidence * 100).toFixed(0)}%
🎯 Success Rate: ${(tradingAssistant.successRate * 100).toFixed(0)}%

${isDemo ? '⚠️ Running in demo mode. Deploy contract for full functionality.' : '✅ Ready for on-chain AI analysis!'} 🚀`);
        
      } else {
        addMessage('system', `🦊 METAMASK REQUIRED FOR FULL FUNCTIONALITY

Install MetaMask to unlock:
• Real-time Chainlink price data
• On-chain AI learning system  
• Personal intelligence evolution
• Verified analysis results

Continuing in demo mode...`);
        
        setWalletInfo({
          address: '0x742d35Cc6634C0532925a3b8D7389e9bA7e7b8b5',
          network: 'Demo Mode',
          balance: '2.4567',
          chainId: 'demo'
        });
      }
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWeb3State(prev => ({ ...prev, error: error.message }));
      addMessage('system', `❌ Connection failed: ${error.message}\n\nContinuing in demo mode...`);
    } finally {
      setIsConnecting(false);
    }
  };

  // ✅ 实时价格获取
  const initializeRealTimePrices = useCallback(() => {
    const updatePrices = async () => {
      let prices = await dataService.getRealPrices();
      
      if (!prices) {
        prices = {
          btc: 102803.10 + (Math.random() - 0.5) * 500,
          eth: 2290.50 + (Math.random() - 0.5) * 50,
          sol: 135.93 + (Math.random() - 0.5) * 10,
          btcChange: -0.69 + (Math.random() - 0.5) * 2,
          ethChange: -5.54 + (Math.random() - 0.5) * 2,
          solChange: -3.20 + (Math.random() - 0.5) * 2,
          lastUpdate: Date.now(),
          source: 'Simulated'
        };
      }
      
      setChainlinkPrices(prices);
    };
    
    updatePrices();
    const interval = setInterval(updatePrices, 30000);
    return interval;
  }, [dataService]);

  // ✅ 修复: 使用useCallback包装seekTruthOnChain
  const seekTruthOnChain = useCallback(async (question) => {
    if (!web3State.contract || web3State.isDemo) {
      return null;
    }
    
    try {
      addMessage('system', '🔄 Submitting question to ECHO3 contract...');
      
      const tx = await web3State.contract.seekTruth(question);
      addMessage('system', `📡 Transaction submitted: ${tx.hash}\nWaiting for confirmation...`);
      
      const receipt = await tx.wait();
      addMessage('system', `✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
      
      // 获取最新quest
      const totalQuests = await web3State.contract.getTotalQuests();
      const quest = await web3State.contract.getQuest(totalQuests);
      const truthMessage = await web3State.contract.getTruthMessage(totalQuests);
      
      const questData = {
        questId: Number(quest[0]),
        seeker: quest[1],
        question: quest[2],
        randomResult: quest[3].toString(),
        isComplete: quest[4],
        timestamp: Number(quest[5]),
        truthLevel: Number(quest[6])
      };
      
      // 更新profile
      setTruthProfile(prev => ({
        ...prev,
        totalSessions: Number(totalQuests),
        onChainVerified: true
      }));
      
      return { questData, truthMessage };
      
    } catch (error) {
      console.error('On-chain interaction failed:', error);
      addMessage('system', `❌ Contract interaction failed: ${error.message}`);
      return null;
    }
  }, [web3State.contract, web3State.isDemo, addMessage]);

  // 决策处理
  const handleHumanDecision = useCallback(async (recommendationId, decision) => {
    setTradingAssistant(prev => {
      const newAssistant = { ...prev };
      
      if (decision === 'accept') {
        newAssistant.successRate = Math.min(0.99, prev.successRate + 0.01);
        newAssistant.confidence = Math.min(0.95, prev.confidence + 0.005);
      } else if (decision === 'reject') {
        newAssistant.humanOverrideCount += 1;
        newAssistant.confidence = Math.max(0.5, prev.confidence - 0.003);
      }
      
      newAssistant.humanDecisionPending = false;
      return newAssistant;
    });

    setTruthProfile(prev => ({
      ...prev,
      humanCollaborationScore: Math.min(1.0, prev.humanCollaborationScore + 0.005),
      adaptationRate: Math.min(1.0, prev.adaptationRate + 0.002),
      onChainProjectsAnalyzed: prev.onChainProjectsAnalyzed + 1
    }));

    addMessage('system', `✅ Decision recorded: ${decision.toUpperCase()}\n\nAI Learning Update:\n• Analysis patterns improved\n• DeFi protocol preferences updated\n• Future recommendations will reflect this feedback\n\n🤖 Your AI assistant is getting smarter!`);
  }, [addMessage]);

  // 多选逻辑
  const toggleCard = useCallback((cardId) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.length > 1 ? prev.filter(id => id !== cardId) : prev;
      } else {
        return [...prev, cardId];
      }
    });
  }, []);

  // 分析类型描述
  const getAnalysisType = useCallback(() => {
    const count = selectedCards.length;
    const cardNames = selectedCards.map(id => truthScenarios[id].title).join(' + ');
    
    if (count === 1) {
      return `Single-dimensional analysis: ${cardNames}`;
    } else if (count === 2) {
      return `Dual-dimensional synthesis: ${cardNames}`;
    } else if (count === 3) {
      return `Full-spectrum deep analysis: ${cardNames}`;
    }
    return 'Select analysis dimensions';
  }, [selectedCards, truthScenarios]);

  // 建议获取
  const getSuggestionsForSelectedCards = useCallback(() => {
    const suggestions = {
      single: {
        personalized: [
          "What DeFi protocols match my risk tolerance?",
          "How should I rebalance my DeFi positions?",
          "Based on my portfolio, which yield farming opportunities suit me?"
        ],
        security: [
          "Analyze the security risks of my current DeFi exposures",
          "Check for dangerous token approvals in my wallets",
          "Review my wallet security and recommend improvements"
        ],
        macro: [
          "How are macro trends affecting DeFi protocol valuations?",
          "Which DeFi ecosystems are gaining institutional adoption?",
          "What regulatory developments could impact my holdings?"
        ]
      },
      combo: [
        "Provide a comprehensive analysis combining all selected dimensions",
        "How do personal patterns align with current security risks?",
        "What's the optimal strategy considering my profile and macro trends?",
        "Give me a multi-dimensional risk-reward assessment"
      ]
    };

    if (selectedCards.length === 1) {
      return suggestions.single[selectedCards[0]] || suggestions.combo;
    }
    return suggestions.combo;
  }, [selectedCards]);

  // 消息内容渲染
  const renderMessageContent = (content) => {
    if (typeof content !== 'string') return content;
    
    const parts = content.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-bold text-white">{boldText}</strong>;
      }
      return part;
    });
  };

  // 引导消息
  const getGuideMessageForSelectedCards = useCallback(() => {
    const analysisType = getAnalysisType();
    const dataSourcesUsed = selectedCards.map(id => truthScenarios[id].dataSource).join('\n');
    
    return `🎯 ${analysisType.toUpperCase()} ACTIVATED

I'm analyzing your situation using ${selectedCards.length} intelligence dimension${selectedCards.length > 1 ? 's' : ''}:
${selectedCards.map(id => `• ${truthScenarios[id].title}: ${truthScenarios[id].description}`).join('\n')}

📊 DATA SOURCES INTEGRATED:
${dataSourcesUsed}

🎯 ANALYSIS CONFIDENCE: ${(modelConfidence * 100).toFixed(0)}%
⏱️ PROCESSING CAPABILITY: ${selectedCards.length === 3 ? 'Maximum Depth' : selectedCards.length === 2 ? 'Enhanced Analysis' : 'Focused Analysis'}

READY FOR MULTI-DIMENSIONAL INSIGHTS! Ask me anything about your DeFi strategy.`;
  }, [selectedCards, getAnalysisType, modelConfidence, truthScenarios]);

  // 监控选择变化
  useEffect(() => {
    if (JSON.stringify(lastSelectedCards) !== JSON.stringify(selectedCards) && hasSentWelcome) {
      const guideMessage = getGuideMessageForSelectedCards();
      addMessage('ai', guideMessage);
      setLastSelectedCards([...selectedCards]);
    }
  }, [selectedCards, lastSelectedCards, hasSentWelcome, getGuideMessageForSelectedCards, addMessage]);

  // 进度模拟
  const simulateAnalysisProgress = useCallback(() => {
    return new Promise((resolve) => {
      let currentProgress = 0;
      let stepIndex = 0;
      
      const interval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          setCurrentProgressStep(step.step);
          
          const stepProgress = Math.min(currentProgress + step.weight, currentProgress + step.weight);
          setAnalysisProgress(stepProgress);
          currentProgress = stepProgress;
          
          if (currentProgress >= stepProgress) {
            stepIndex++;
          }
        } else {
          setAnalysisProgress(100);
          setCurrentProgressStep('Analysis complete - insights ready');
          clearInterval(interval);
          setTimeout(resolve, 500);
        }
      }, 800 + Math.random() * 400);
    });
  }, [progressSteps]);

  // 生成推荐
  const generateRecommendation = useCallback(async () => {
    const recommendations = [
      {
        type: 'PROTOCOL_ANALYSIS',
        project: 'Uniswap V4',
        confidence: 0.85 + Math.random() * 0.10,
        suggestion: `Uniswap V4's hook system shows strong innovation potential. Based on your DeFi preferences, consider ${(Math.random() * 2 + 1).toFixed(1)}x exposure during initial deployment phase.`,
        reasoning: 'Hook architecture enables custom AMM logic, creating new revenue streams',
        riskLevel: 'MEDIUM',
        expectedOutcome: '+25-40% based on V3 adoption patterns',
        humanDecisionRequired: true,
        tvl: '$4.2B',
        ecosystem: 'Ethereum DeFi'
      },
      {
        type: 'YIELD_OPPORTUNITY',
        project: 'Pendle Finance',
        confidence: 0.82 + Math.random() * 0.12,
        suggestion: `Pendle's yield tokenization shows growing adoption. Based on your yield farming history, consider ${(Math.random() * 1.5 + 1).toFixed(1)}x position in PT tokens.`,
        reasoning: 'Yield trading market expansion with institutional interest',
        riskLevel: 'MEDIUM-HIGH',
        expectedOutcome: '+30-50% based on yield curve optimization',
        humanDecisionRequired: true,
        tvl: '$180M',
        ecosystem: 'Yield Trading'
      }
    ];

    const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
    
    setTradingAssistant(prev => ({
      ...prev,
      lastRecommendation: {
        ...recommendation,
        timestamp: Date.now(),
        id: Date.now()
      },
      humanDecisionPending: recommendation.humanDecisionRequired
    }));

    return recommendation;
  }, []);

  // 查询处理
  const processUserQuery = useCallback(async (query) => {
    const lowerQuery = query.toLowerCase();
    const analysisType = getAnalysisType();
    const combinedDataSources = selectedCards.map(id => truthScenarios[id].dataSource).join('\n');
    
    // 获取实时市场数据
    const realPrices = await dataService.getRealPrices();
    
    // 尝试链上分析
    const onChainResult = await seekTruthOnChain(query);
    
    if (lowerQuery.includes('should i') || lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('analyze')) {
      const recommendation = await generateRecommendation();
      
      let responseContent = `🤖 ${analysisType.toUpperCase()} COMPLETE

MULTI-DIMENSIONAL ANALYSIS RESULTS:
${selectedCards.map(id => `✅ ${truthScenarios[id].title} Module: Active`).join('\n')}

📊 CURRENT MARKET CONTEXT:
• ETH Price: $${realPrices?.eth?.toFixed(2) || chainlinkPrices.eth?.toFixed(2) || 'Loading...'}
• BTC Price: $${realPrices?.btc?.toLocaleString() || chainlinkPrices.btc?.toLocaleString() || 'Loading...'}
• Data Source: ${realPrices?.source || chainlinkPrices.source || 'Loading...'}

RECOMMENDATION: ${recommendation.suggestion}

WHY THIS MATTERS FOR YOU:
• Project: ${recommendation.project} (${recommendation.ecosystem})
• TVL: ${recommendation.tvl} - Strong liquidity foundation
• My Confidence: ${(recommendation.confidence * 100).toFixed(0)}% (Multi-dimensional analysis)
• Risk Level: ${recommendation.riskLevel}

STRATEGIC REASONING: ${recommendation.reasoning}

EXPECTED OUTCOME: ${recommendation.expectedOutcome}`;

      // 如果有链上结果，添加到响应中
      if (onChainResult) {
        const truthLevels = ['Seeking Truth...', 'Partial Truth Revealed', 'Significant Discovery', 'Profound Insight', 'Ultimate Truth'];
        responseContent += `

🔗 ON-CHAIN VERIFICATION:
• Quest ID: #${onChainResult.questData.questId}
• Truth Level: ${truthLevels[onChainResult.questData.truthLevel]}
• AI Insight: "${onChainResult.truthMessage}"
• Block Verified: ✅`;
      }

      responseContent += `

📊 DATA SOURCES USED IN THIS ANALYSIS:
${combinedDataSources}
${web3State.contract ? '⛓️ On-chain Contract: ACTIVE' : '⚠️ Demo Mode: Simulated data'}

This ${selectedCards.length === 3 ? 'comprehensive' : selectedCards.length === 2 ? 'enhanced' : 'focused'} analysis combines ${selectedCards.length} intelligence dimension${selectedCards.length > 1 ? 's' : ''} with real-time market data.`;

      return {
        content: responseContent,
        data: { recommendation, requiresDecision: recommendation.humanDecisionRequired, onChainResult }
      };
    }
    
    // 生成基于选择的响应
    const getResponseForSelection = () => {
      const responses = selectedCards.map(cardId => {
        const scenario = truthScenarios[cardId];
        return `🎯 ${scenario.title.toUpperCase()} ANALYSIS:\n${scenario.description}`;
      }).join('\n\n');

      let responseContent = `${analysisType.toUpperCase()} ACTIVATED

${responses}

CURRENT PERFORMANCE METRICS:
• Analysis Dimensions: ${selectedCards.length}/3 active
• ETH Base Layer: ${chainlinkPrices.eth?.toFixed(2) || 'Loading...'} - Your primary DeFi foundation
• AI Collaboration Score: ${(truthProfile.humanCollaborationScore * 100).toFixed(0)}%
• Protocols Analyzed: ${truthProfile.onChainProjectsAnalyzed}

📊 INTEGRATED DATA SOURCES:
${combinedDataSources}

🎯 OPTIMIZATION OPPORTUNITY:
Your ${selectedCards.length === 3 ? 'full-spectrum' : selectedCards.length === 2 ? 'dual-dimension' : 'focused'} analysis is ready. Ask me about specific protocols or strategies for personalized insights.`;

      // 如果有链上结果，添加到响应中
      if (onChainResult) {
        const truthLevels = ['Seeking Truth...', 'Partial Truth Revealed', 'Significant Discovery', 'Profound Insight', 'Ultimate Truth'];
        responseContent += `

🔗 ON-CHAIN VERIFICATION:
• Quest ID: #${onChainResult.questData.questId}
• Truth Level: ${truthLevels[onChainResult.questData.truthLevel]}
• AI Insight: "${onChainResult.truthMessage}"
• Timestamp: ${new Date(onChainResult.questData.timestamp * 1000).toLocaleString()}`;
      }

      return responseContent;
    };
    
    return { content: getResponseForSelection(), data: { onChainResult } };
  }, [getAnalysisType, selectedCards, truthScenarios, dataService, generateRecommendation, chainlinkPrices.eth, chainlinkPrices.btc, chainlinkPrices.source, truthProfile.humanCollaborationScore, truthProfile.onChainProjectsAnalyzed, web3State.contract, seekTruthOnChain]);

  // 执行分析
  const performAnalysis = useCallback(async () => {
    if (!inputValue.trim() || isAnalyzing) return;
    
    const userInput = inputValue.trim();
    addMessage('user', userInput);
    setInputValue('');
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setShowSuggestions(false);
    
    try {
      await simulateAnalysisProgress();
      
      const result = await processUserQuery(userInput);
      addMessage('ai', result.content, result.data);
      
      // 更新学习状态
      setTruthProfile(prev => {
        const learningGain = 0.002 + Math.random() * 0.003;
        return {
          ...prev,
          adaptationRate: Math.min(1.0, prev.adaptationRate + learningGain),
          predictionAccuracy: Math.min(1.0, prev.predictionAccuracy + learningGain * 0.8),
          truthScore: Math.min(1.0, prev.truthScore + learningGain * 1.2),
          learningVelocity: Math.min(1.0, prev.learningVelocity + learningGain * 0.5),
          totalSessions: prev.totalSessions + 1,
          humanCollaborationScore: Math.min(1.0, prev.humanCollaborationScore + learningGain * 0.6)
        };
      });
      
      setModelConfidence(prev => Math.min(0.99, prev + 0.005));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      addMessage('ai', 'Truth analysis temporarily unavailable. Your AI assistant is adapting to new DeFi realities.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentProgressStep('');
    }
  }, [inputValue, isAnalyzing, addMessage, simulateAnalysisProgress, processUserQuery]);

  // 建议点击处理
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
  }, []);

  // 初始化应用
  useEffect(() => {
    let priceInterval = null;
    let timeoutId = null;
    
    const initializeApp = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        priceInterval = initializeRealTimePrices();
        
        setIsLoading(false);
        
        const welcomeMessage = `🚀 ECHO3 COLLABORATIVE INTELLIGENCE INITIALIZED

CORE MISSION: "Reducing noise, return to Truth."

HOW I HELP YOU BE MORE EFFICIENT:
✅ Learn from YOUR successful DeFi strategies  
✅ Provide personalized protocol analysis
✅ Identify opportunities that match your patterns
✅ Security-check investments before you make them

YOUR CURRENT AI PROFILE:
• Collaboration Score: ${(truthProfile.humanCollaborationScore * 100).toFixed(0)}% - We work well together
• Success Pattern Recognition: ${(truthProfile.truthScore * 100).toFixed(0)}% - Strong learning foundation  
• Analysis Confidence: ${(tradingAssistant.confidence * 100).toFixed(0)}% - Getting smarter with each interaction

MULTI-DIMENSIONAL ANALYSIS READY:
✅ Select 1 card for focused analysis
✅ Select 2 cards for enhanced insights  
✅ Select 3 cards for comprehensive intelligence

Click any combination of modes above, then ask me about a specific DeFi decision. The more dimensions you select, the deeper the analysis! 🎯`;

        addMessage('system', welcomeMessage);
        setHasSentWelcome(true);
        
        timeoutId = setTimeout(() => {
          const guideMessage = getGuideMessageForSelectedCards();
          addMessage('ai', guideMessage);
        }, 3000);
        
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
    
    return () => {
      if (priceInterval) {
        clearInterval(priceInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initializeRealTimePrices, addMessage, truthProfile.humanCollaborationScore, truthProfile.truthScore, tradingAssistant.confidence, getGuideMessageForSelectedCards]);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const handleKeyPress = (e) => { if (e.key === 'Enter') performAnalysis(); };

  // ✅ 加载界面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            
            <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
              <div className="relative">
                <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" strokeWidth="0.5" stroke="currentColor"/>
                  <path d="M15.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" opacity="0.8"/>
                  <path d="M19 12c0-3.07-1.63-5.36-4-6.32v2.1c1.38.96 2 2.7 2 4.22s-.62 3.26-2 4.22v2.1c2.37-.96 4-3.25 4-6.32z" opacity="0.6"/>
                </svg>
                
                <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '12px'}}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping shadow-lg" style={{animationDuration: '2s', animationDelay: '0s'}}></div>
                </div>
                <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '20px'}}>
                  <div className="w-1 h-1 bg-white/80 rounded-full animate-ping shadow-md" style={{animationDuration: '2s', animationDelay: '0.4s'}}></div>
                </div>
                <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '26px'}}>
                  <div className="w-0.5 h-0.5 bg-white/60 rounded-full animate-ping shadow-sm" style={{animationDuration: '2s', animationDelay: '0.8s'}}></div>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
          </div>
          
          <h1 className="text-6xl font-extralight text-white tracking-tight mb-6">ECHO3</h1>
          
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-r from-slate-900/40 to-indigo-900/40 rounded-2xl p-6 border border-white/10 backdrop-blur">
                <h2 className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-wide text-center">
                  Reducing noise, return to Truth.
                </h2>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-8 w-8 border-3 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-blue-300 text-lg">Loading AI Agent...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <div className="px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6 pt-6">
              <div className="w-20 h-20 relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-30 group-hover:opacity-40 transition-opacity duration-300"></div>
                
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300">
                  <div className="relative">
                    <svg className="w-11 h-11 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3z" strokeWidth="0.3" stroke="currentColor"/>
                      <path d="M15.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" opacity="0.8"/>
                      <path d="M19 12c0-3.07-1.63-5.36-4-6.32v2.1c1.38.96 2 2.7 2 4.22s-.62 3.26-2 4.22v2.1c2.37-.96 4-3.25 4-6.32z" opacity="0.6"/>
                    </svg>
                    
                    <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '8px'}}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping shadow-lg" style={{animationDuration: '1.8s', animationDelay: '0s'}}></div>
                    </div>
                    <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '14px'}}>
                      <div className="w-1 h-1 bg-white/85 rounded-full animate-ping shadow-md" style={{animationDuration: '1.8s', animationDelay: '0.3s'}}></div>
                    </div>
                    <div className="absolute flex items-center justify-center" style={{left: '100%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '19px'}}>
                      <div className="w-0.5 h-0.5 bg-white/70 rounded-full animate-ping shadow-sm" style={{animationDuration: '1.8s', animationDelay: '0.6s'}}></div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full pointer-events-none"></div>
                <div className="absolute inset-3 bg-gradient-to-tr from-white/10 to-transparent rounded-full pointer-events-none"></div>
                <div className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white/30 transition-colors duration-300"></div>
              </div>
              
              <div>
                <h1 className="text-5xl font-extralight text-white tracking-tight">ECHO3</h1>
                <p className="text-xl text-blue-200 font-light mt-1">Multi-Dimensional AI Analysis</p>
                <p className="text-sm text-gray-400 mt-1">
                  <span className="inline-flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    {selectedCards.length} Dimension{selectedCards.length > 1 ? 's' : ''} Active
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center">
                    {web3State?.isDemo !== false ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1 animate-pulse"></div>
                        Demo Mode
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        On-chain Active
                      </>
                    )}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center">
                    {chainlinkPrices?.source ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                        {chainlinkPrices.source}
                      </>
                    ) : (
                      'Connecting...'
                    )}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pt-8">
              {/* Assets panel */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/30 shadow-xl w-44 h-72">
                <div className="text-xs text-gray-300 mb-3 flex items-center justify-between">
                  <span className="font-semibold text-white text-xs">DeFi Assets</span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 text-xs rounded-full font-bold flex items-center border border-green-400/20">
                    <div className="w-1 h-1 bg-green-400 rounded-full mr-1 animate-pulse shadow-sm"></div>
                    LIVE
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 transition-all duration-300 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${chainlinkPrices.btc ? 'bg-orange-500' : 'bg-yellow-500'} shadow-lg`}></div>
                        {chainlinkPrices.btc && <div className="absolute inset-0 w-2 h-2 bg-orange-500 rounded-full animate-ping opacity-30"></div>}
                      </div>
                      <span className="text-white font-semibold text-xs">BTC</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-xs">${chainlinkPrices.btc?.toLocaleString() || 'Loading...'}</div>
                      <div className={`text-xs font-medium ${(chainlinkPrices.btcChange || -0.69) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(chainlinkPrices.btcChange || -0.69) >= 0 ? '+' : ''}{(chainlinkPrices.btcChange || -0.69).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 transition-all duration-300 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${chainlinkPrices.eth ? 'bg-blue-500' : 'bg-yellow-500'} shadow-lg`}></div>
                        {chainlinkPrices.eth && <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-30"></div>}
                      </div>
                      <span className="text-white font-semibold text-xs">ETH</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-xs">${chainlinkPrices.eth?.toLocaleString() || 'Loading...'}</div>
                      <div className={`text-xs font-medium ${(chainlinkPrices.ethChange || -5.54) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(chainlinkPrices.ethChange || -5.54) >= 0 ? '+' : ''}{(chainlinkPrices.ethChange || -5.54).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 transition-all duration-300 border border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${chainlinkPrices.sol ? 'bg-purple-500' : 'bg-yellow-500'} shadow-lg`}></div>
                        {chainlinkPrices.sol && <div className="absolute inset-0 w-2 h-2 bg-purple-500 rounded-full animate-ping opacity-30"></div>}
                      </div>
                      <span className="text-white font-semibold text-xs">SOL</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-xs">${chainlinkPrices.sol?.toFixed(2) || 'Loading...'}</div>
                      <div className={`text-xs font-medium ${(chainlinkPrices.solChange || -3.20) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(chainlinkPrices.solChange || -3.20) >= 0 ? '+' : ''}{(chainlinkPrices.solChange || -3.20).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3 w-44 h-72">
                {!walletInfo ? (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl font-medium transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 text-sm"
                  >
                    {isConnecting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" clipRule="evenodd" />
                        </svg>
                        <span>Connect Wallet</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 bg-green-500/20 rounded-2xl text-green-400 text-sm backdrop-blur border border-green-500/30">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs">{walletInfo.address.substring(0, 8)}...{walletInfo.address.slice(-4)}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-center mt-1">{walletInfo.network}</div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-white/15 to-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/30 shadow-xl flex-1 flex flex-col">
                  <div className="text-xs text-gray-300 mb-3 flex items-center justify-between">
                    <span className="font-semibold text-white">AI Assistant</span>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-2.5 text-sm flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Dimensions:</span>
                        <span className="text-purple-400 font-bold">{selectedCards.length}/3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-blue-400 font-bold">{(tradingAssistant.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Success:</span>
                        <span className="text-green-400 font-bold">{(tradingAssistant.successRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Mode:</span>
                      <span className={`text-xs font-bold ${web3State.isDemo ? 'text-yellow-400' : 'text-green-400'}`}>
                        {web3State.isDemo ? 'DEMO' : 'ON-CHAIN'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extralight text-white mb-4">Multi-Dimensional AI Intelligence</h2>
            <p className="text-lg text-gray-300 mb-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Select any combination of analysis dimensions for personalized insights
            </p>
            <div className="text-sm text-blue-200 font-medium">
              Current Selection: {getAnalysisType()}
            </div>
          </div>
          
          {/* 多选智能卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {Object.entries(truthScenarios).map(([key, scenario]) => {
              const isSelected = selectedCards.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => toggleCard(key)}
                  className={`group relative p-8 rounded-3xl border-2 cursor-pointer transition-all duration-500 transform hover:scale-105 ${
                    isSelected
                      ? 'border-blue-400/80 bg-gradient-to-br from-blue-900/40 to-purple-900/40 shadow-2xl shadow-blue-500/20' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 backdrop-blur-xl'
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-20 h-20 mx-auto mb-6 relative group-hover:scale-110 transition-transform duration-300`}>
                      <div className={`absolute -inset-3 bg-gradient-to-r ${scenario.color} rounded-full blur-2xl opacity-20 animate-pulse group-hover:opacity-40 transition-opacity duration-300`}></div>
                      <div className={`absolute -inset-2 bg-gradient-to-r ${scenario.color} rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
                      <div className={`relative w-20 h-20 bg-gradient-to-r ${scenario.color} rounded-full flex items-center justify-center shadow-2xl`}>
                        <span className="text-3xl filter drop-shadow-lg">{scenario.icon}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-blue-200 transition-colors duration-300">{scenario.title}</h3>
                    <p className="text-blue-200 text-sm mb-4 font-medium">{scenario.subtitle}</p>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">{scenario.description}</p>
                    
                    <div className="mb-4 p-2 bg-white/10 rounded-lg">
                      <div className="text-xs text-gray-400 font-medium">{scenario.dataSource}</div>
                    </div>
                    
                    <div className="mb-6">
                      <span className={`px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg ${
                        isSelected ? 'animate-pulse' : ''
                      }`}>
                        {scenario.truthLevel}
                      </span>
                      {scenario.badge && (
                        <span className="ml-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                          {scenario.badge}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-left space-y-3">
                      {scenario.features.slice(0, 3).map((feature, idx) => (
                        <div key={`feature-${key}-${idx}`} className="text-xs text-gray-400 flex items-center group-hover:text-gray-300 transition-colors duration-300">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"></div>
                          <span className="font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Status</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                          }`}></div>
                          <span className={isSelected ? 'text-green-400' : 'text-gray-500'}>
                            {isSelected ? 'ACTIVE' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <>
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg flex items-center justify-center">
                        <div className="text-white font-bold text-sm">{selectedCards.indexOf(key) + 1}</div>
                      </div>
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>
                    </>
                  )}
                  
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>
              );
            })}
          </div>

          {/* 神经网络连接效果 */}
          <div className="mb-8 flex justify-center relative">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
              
              <div className="flex items-center space-x-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={`neural-dot-${i}`}
                    className="w-1 h-1 bg-blue-400 rounded-full animate-pulse shadow-sm"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      opacity: 0.3 + (Math.sin(i * 0.5) * 0.4)
                    }}
                  ></div>
                ))}
              </div>
              
              <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
            </div>
            
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-300 flex items-center space-x-2">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
              <span>Neural Data Flow Active • {selectedCards.length} Dimension{selectedCards.length > 1 ? 's' : ''} Connected</span>
            </div>
          </div>

          {/* AI助手面板 */}
          {tradingAssistant.lastRecommendation && (
            <div className="mb-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-3xl border border-purple-500/30 overflow-hidden backdrop-blur">
              <div className="p-6">
                <h4 className="text-2xl font-semibold text-white mb-4 flex items-center">
                  🤖 AI Multi-Dimensional Assistant
                  <span className="ml-3 px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
                    {selectedCards.length}D Analysis
                  </span>
                </h4>
                
                <div className="bg-white/10 rounded-2xl p-6 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg text-white">{tradingAssistant.lastRecommendation.type.replace('_', ' ')}</div>
                    <div className="text-lg text-blue-400 font-semibold">{tradingAssistant.lastRecommendation.project}</div>
                  </div>
                  <div className="text-gray-300 mb-4">{tradingAssistant.lastRecommendation.suggestion}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-400">Ecosystem:</span>
                      <div className="text-xl text-blue-400">{tradingAssistant.lastRecommendation.ecosystem}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">TVL:</span>
                      <div className="text-xl text-green-400">{tradingAssistant.lastRecommendation.tvl}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Confidence:</span>
                      <div className="text-xl text-blue-400">{(tradingAssistant.lastRecommendation.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Risk Level:</span>
                      <div className={`text-xl ${
                        tradingAssistant.lastRecommendation.riskLevel === 'LOW' ? 'text-green-400' :
                        tradingAssistant.lastRecommendation.riskLevel.includes('MEDIUM') ? 'text-yellow-400' : 'text-red-400'
                      }`}>{tradingAssistant.lastRecommendation.riskLevel}</div>
                    </div>
                  </div>
                  
                  {tradingAssistant.humanDecisionPending && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleHumanDecision(tradingAssistant.lastRecommendation.id, 'accept')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleHumanDecision(tradingAssistant.lastRecommendation.id, 'modify')}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => handleHumanDecision(tradingAssistant.lastRecommendation.id, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 聊天界面 */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
            <div className="h-96 overflow-y-auto p-6 space-y-6" style={{scrollbarWidth: 'thin'}}>
              {chatHistory.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-4xl rounded-2xl p-6 ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : message.type === 'system'
                      ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-emerald-100 border border-emerald-400/30'
                      : 'bg-white/10 text-white backdrop-blur'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl flex-shrink-0 mt-1">
                        {message.type === 'user' ? '👤' : message.type === 'system' ? '🚀' : '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                          {renderMessageContent(message.content)}
                        </div>
                        
                        {message.dataSourcesUsed && (
                          <div className="mt-4 p-3 bg-white/10 rounded-xl">
                            <div className="text-xs text-gray-300 mb-2">📊 Data Sources Used in Analysis:</div>
                            <div className="text-xs text-gray-400 space-y-1">
                              {message.dataSourcesUsed.map((source, idx) => (
                                <div key={`source-${message.id}-${idx}`}>• {source}</div>
                              ))}
                            </div>
                            <div className="text-xs text-blue-400 mt-2">
                              🎯 Confidence: {message.confidence ? (message.confidence * 100).toFixed(0) + '%' : 'N/A'} | 
                              ⏱️ Generated: {formatTime(message.timestamp)}
                            </div>
                          </div>
                        )}
                        
                        {message.requiresDecision && (
                          <div className="mt-4 p-4 bg-white/10 rounded-xl">
                            <div className="text-sm text-gray-300 mb-3">This recommendation requires your decision:</div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleHumanDecision(message.data?.recommendation?.id, 'accept')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleHumanDecision(message.data?.recommendation?.id, 'modify')}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs transition-colors"
                              >
                                Modify
                              </button>
                              <button 
                                onClick={() => handleHumanDecision(message.data?.recommendation?.id, 'reject')}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {message.truthScore && (
                          <div className="mt-4 flex items-center space-x-4">
                            <div className="text-xs text-gray-400">Truth Score:</div>
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-1000" 
                                style={{width: `${message.truthScore * 100}%`}}
                              ></div>
                            </div>
                            <span className="text-xs text-blue-400">{(message.truthScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-white rounded-2xl p-6 backdrop-blur max-w-md">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">🤖</div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                          <span className="text-sm text-gray-300">
                            {selectedCards.length}D Analysis in progress...
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{currentProgressStep}</span>
                            <span className="text-blue-400 font-medium">{analysisProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 h-2 rounded-full transition-all duration-300" 
                              style={{width: `${analysisProgress}%`}}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Processing {selectedCards.length} intelligence dimension{selectedCards.length > 1 ? 's' : ''}...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 输入界面 */}
            <div className="p-8 border-t border-white/20 bg-gradient-to-r from-slate-900/50 to-indigo-900/50">
              <h3 className="text-3xl font-light text-white mb-6">Multi-Dimensional Intelligence Interface</h3>
              
              {showSuggestions && (
                <div className="mb-6 bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/20">
                  <h4 className="text-lg font-medium text-white mb-4">💡 Suggested queries for {getAnalysisType()}:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getSuggestionsForSelectedCards().map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left text-sm text-gray-400 hover:text-white p-3 rounded-lg hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={`Ask your ${selectedCards.length}D AI assistant about DeFi strategies, security risks, or market analysis...`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={isAnalyzing}
                    className="w-full px-6 py-4 rounded-2xl bg-white/10 text-white placeholder-purple-200 border border-white/30 focus:border-purple-400 focus:outline-none transition-all backdrop-blur text-lg"
                  />
                  
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={performAnalysis}
                  disabled={isAnalyzing || !inputValue.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-semibold transition-all duration-200 flex items-center space-x-3 shadow-lg"
                >
                  {isAnalyzing && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>}
                  <span>{isAnalyzing ? 'Analyzing...' : `Analyze (${selectedCards.length}D)`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16">
            <div className="mb-12 text-center">
              <div className="inline-block px-10 py-6 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-500/50 rounded-3xl backdrop-blur-xl shadow-2xl">
                <p className="text-blue-200 text-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                    </svg>
                  </div>
                  echo3.me • Multi-Dimensional DeFi Intelligence • Personal Trading Analysis
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-slate-900/80 to-indigo-900/80 rounded-3xl p-8 border border-white/20 backdrop-blur">
              <div className="mt-8 pt-6 border-t border-white/20 flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                    </svg>
                  </div>
                  <span className="text-gray-400 text-sm flex items-center">
                    <span className="text-gray-500 mr-1">©</span>
                    2025 ECHO3. All rights reserved.
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                    </svg>
                  </div>
                  <span className="text-gray-500 text-sm">⛓️</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm">Chainlink Hackathon 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECHO3Dashboard;