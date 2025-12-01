import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Edit2, Trash2, Check, X, List, PieChart, CreditCard } from 'lucide-react';

export default function ExpenseTracker() {
  const [monthlyIncome, setMonthlyIncome] = useState(4000);
  const [expenses, setExpenses] = useState({
    housing: 0,
    transportation: 0,
    food: 0,
    insurance: 0,
    entertainment: 0,
    education: 0,
    gifts: 0,
    other: 0,
    investments: 0
  });

  const [categories, setCategories] = useState([
    { key: 'housing', label: 'Rent, Mortgage & Utilities', icon: '🏠' },
    { key: 'transportation', label: 'Transportation (Car, Taxi, Transit)', icon: '🚗' },
    { key: 'food', label: 'Food (Groceries, Eating Out, Coffee)', icon: '🍽️' },
    { key: 'insurance', label: 'Insurance, Healthcare & Pension', icon: '🏥' },
    { key: 'entertainment', label: 'Entertainment & Subscriptions', icon: '🎬' },
    { key: 'education', label: 'Education, Reading & Courses', icon: '📚' },
    { key: 'gifts', label: 'Gifts & Donations', icon: '🎁' },
    { key: 'other', label: 'Non-Categorized / Other', icon: '📋' },
    { key: 'investments', label: 'Investments', icon: '📈' }
  ]);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [isGeneratingEmoji, setIsGeneratingEmoji] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [subCategories, setSubCategories] = useState({});
  const [newSubItemName, setNewSubItemName] = useState('');
  const [newSubItemAmount, setNewSubItemAmount] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [isIncomeFocused, setIsIncomeFocused] = useState(false);
  const [incomeInputValue, setIncomeInputValue] = useState('');
  const [editingSubItem, setEditingSubItem] = useState(null);
  const [editSubItemName, setEditSubItemName] = useState('');
  const [editSubItemAmount, setEditSubItemAmount] = useState('');
  const [currentPage, setCurrentPage] = useState('tracker');
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // PWA Installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  // Load saved data on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('expenseTrackerData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.monthlyIncome !== undefined) setMonthlyIncome(parsed.monthlyIncome);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.subCategories) setSubCategories(parsed.subCategories);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    try {
      const dataToSave = {
        monthlyIncome,
        expenses,
        categories,
        subCategories
      };
      localStorage.setItem('expenseTrackerData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, [monthlyIncome, expenses, categories, subCategories]);

  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const remaining = monthlyIncome - totalExpenses;
  const totalPercentage = monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 0;

  const handleExpenseChange = (category, value) => {
    setExpenses(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Handle math expressions in expense inputs
  const handleExpenseKeyPress = (e, category) => {
    if (e.key === 'Enter') {
      const input = e.target.value.trim();
      
      // If input starts with an operator, add it to the current value
      if (input.match(/^[\+\-\*\/]/)) {
        const currentValue = parseFloat(expenses[category]) || 0;
        const expression = currentValue + input;
        try {
          const result = eval(expression);
          if (!isNaN(result)) {
            setExpenses(prev => ({
              ...prev,
              [category]: result
            }));
          }
        } catch (error) {
          console.error('Invalid expression');
        }
      } 
      // If input contains math operators, evaluate it
      else if (input.match(/[\+\-\*\/]/)) {
        try {
          const result = eval(input);
          if (!isNaN(result)) {
            setExpenses(prev => ({
              ...prev,
              [category]: result
            }));
          }
        } catch (error) {
          console.error('Invalid expression');
        }
      }
      
      e.target.blur(); // Remove focus after calculation
    }
  };

  const getPercentage = (amount) => {
    if (monthlyIncome === 0) return 0;
    return ((parseFloat(amount) || 0) / monthlyIncome) * 100;
  };

  const getStatusColor = () => {
    if (remaining > 0) return '#10b981';
    if (remaining === 0) return '#f59e0b';
    return '#ef4444';
  };

  // Generate emoji using Claude API
  const generateEmojiForCategory = async (categoryName) => {
    setIsGeneratingEmoji(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          messages: [
            { 
              role: "user", 
              content: `Given this expense category name: "${categoryName}", suggest ONE single emoji that best represents it. Respond with ONLY the emoji character, nothing else. No text, no explanation, just the emoji.`
            }
          ]
        })
      });
      
      const data = await response.json();
      const emoji = data.content[0].text.trim();
      setIsGeneratingEmoji(false);
      return emoji;
    } catch (error) {
      console.error("Error generating emoji:", error);
      setIsGeneratingEmoji(false);
      return '📌'; // Default emoji if API fails
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryLabel.trim()) return;
    
    const emoji = await generateEmojiForCategory(newCategoryLabel);
    const key = `custom_${Date.now()}`;
    
    setCategories([...categories, {
      key,
      label: newCategoryLabel,
      icon: emoji
    }]);
    
    setExpenses(prev => ({
      ...prev,
      [key]: 0
    }));
    
    setNewCategoryLabel('');
    setIsAddingCategory(false);
  };

  // Start editing category
  const startEditCategory = (category) => {
    setEditingCategory(category.key);
    setEditLabel(category.label);
  };

  // Save edited category
  const saveEditCategory = async () => {
    const oldCategory = categories.find(cat => cat.key === editingCategory);
    
    // If the label changed significantly, regenerate the emoji
    if (oldCategory && editLabel.trim() !== oldCategory.label) {
      setIsGeneratingEmoji(true);
      const newEmoji = await generateEmojiForCategory(editLabel);
      
      setCategories(categories.map(cat => 
        cat.key === editingCategory 
          ? { ...cat, label: editLabel, icon: newEmoji }
          : cat
      ));
      setIsGeneratingEmoji(false);
    } else {
      setCategories(categories.map(cat => 
        cat.key === editingCategory 
          ? { ...cat, label: editLabel }
          : cat
      ));
    }
    
    setEditingCategory(null);
    setEditLabel('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCategory(null);
    setEditLabel('');
  };

  // Delete category
  const deleteCategory = (key) => {
    setCategories(categories.filter(cat => cat.key !== key));
    const newExpenses = { ...expenses };
    delete newExpenses[key];
    setExpenses(newExpenses);
    
    // Also remove sub-categories
    const newSubCategories = { ...subCategories };
    delete newSubCategories[key];
    setSubCategories(newSubCategories);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(dropIndex, 0, draggedItem);
    
    setCategories(newCategories);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Toggle sub-category expansion
  const toggleSubCategories = (categoryKey) => {
    const isOpening = expandedCategory !== categoryKey;
    
    if (isOpening) {
      // If opening and there's an existing amount but no sub-categories, create a base item
      const currentAmount = parseFloat(expenses[categoryKey]) || 0;
      const existingSubItems = subCategories[categoryKey] || [];
      
      if (currentAmount !== 0 && existingSubItems.length === 0) {
        const categoryName = categories.find(cat => cat.key === categoryKey)?.label || 'Category';
        const baseItem = {
          id: Date.now(),
          name: `${categoryName} (Base)`,
          amount: currentAmount
        };
        
        setSubCategories({
          ...subCategories,
          [categoryKey]: [baseItem]
        });
      }
    }
    
    setExpandedCategory(isOpening ? categoryKey : null);
    setNewSubItemName('');
    setNewSubItemAmount('');
  };

  // Add sub-category item
  const addSubItem = (categoryKey) => {
    if (!newSubItemName.trim() || !newSubItemAmount) return;

    // Parse the amount, handling negative values and dollar signs
    const parsedAmount = parseFloat(parseCurrencyInput(newSubItemAmount.toString()));
    if (isNaN(parsedAmount)) return;

    const subItem = {
      id: Date.now(),
      name: newSubItemName.trim(),
      amount: parsedAmount
    };

    const categorySubItems = subCategories[categoryKey] || [];
    const newSubItems = [...categorySubItems, subItem];
    
    setSubCategories({
      ...subCategories,
      [categoryKey]: newSubItems
    });

    // Update main expense to sum of sub-items
    const total = newSubItems.reduce((sum, item) => sum + item.amount, 0);
    setExpenses(prev => ({
      ...prev,
      [categoryKey]: total
    }));

    setNewSubItemName('');
    setNewSubItemAmount('');
  };

  // Delete sub-category item
  const deleteSubItem = (categoryKey, itemId) => {
    const categorySubItems = subCategories[categoryKey] || [];
    const newSubItems = categorySubItems.filter(item => item.id !== itemId);
    
    setSubCategories({
      ...subCategories,
      [categoryKey]: newSubItems
    });

    // Update main expense
    const total = newSubItems.reduce((sum, item) => sum + item.amount, 0);
    setExpenses(prev => ({
      ...prev,
      [categoryKey]: total
    }));
  };

  // Start editing sub-item
  const startEditSubItem = (categoryKey, item) => {
    setEditingSubItem({ categoryKey, itemId: item.id });
    setEditSubItemName(item.name);
    setEditSubItemAmount(item.amount.toString());
  };

  // Save edited sub-item
  const saveEditSubItem = () => {
    if (!editSubItemName.trim() || !editSubItemAmount) {
      cancelEditSubItem();
      return;
    }

    const { categoryKey, itemId } = editingSubItem;
    const parsedAmount = parseFloat(parseCurrencyInput(editSubItemAmount.toString()));
    
    if (isNaN(parsedAmount)) {
      cancelEditSubItem();
      return;
    }

    const categorySubItems = subCategories[categoryKey] || [];
    const newSubItems = categorySubItems.map(item =>
      item.id === itemId
        ? { ...item, name: editSubItemName.trim(), amount: parsedAmount }
        : item
    );

    setSubCategories({
      ...subCategories,
      [categoryKey]: newSubItems
    });

    // Update main expense
    const total = newSubItems.reduce((sum, item) => sum + item.amount, 0);
    setExpenses(prev => ({
      ...prev,
      [categoryKey]: total
    }));

    cancelEditSubItem();
  };

  // Cancel editing sub-item
  const cancelEditSubItem = () => {
    setEditingSubItem(null);
    setEditSubItemName('');
    setEditSubItemAmount('');
  };

  // Get contextual placeholder for sub-category based on category name
  const getSubCategoryPlaceholder = (categoryLabel) => {
    const label = categoryLabel.toLowerCase();
    
    if (label.includes('car') || label.includes('transport') || label.includes('vehicle')) {
      return 'e.g., Audi A5';
    } else if (label.includes('phone') || label.includes('cell')) {
      return 'e.g., T-Mobile';
    } else if (label.includes('food') || label.includes('groceries') || label.includes('eating')) {
      return 'e.g., Whole Foods';
    } else if (label.includes('insurance') || label.includes('health')) {
      return 'e.g., Blue Cross';
    } else if (label.includes('entertainment') || label.includes('subscription')) {
      return 'e.g., Netflix';
    } else if (label.includes('education') || label.includes('course') || label.includes('reading')) {
      return 'e.g., Textbooks';
    } else if (label.includes('gift') || label.includes('donation')) {
      return 'e.g., Birthday Gift';
    } else if (label.includes('investment')) {
      return 'e.g., 401k';
    } else if (label.includes('rent') || label.includes('mortgage') || label.includes('utilities')) {
      return 'e.g., Rent';
    } else {
      return 'e.g., Item name';
    }
  };

  // Format value for display in expense input
  const formatExpenseDisplay = (value) => {
    if (!value && value !== 0) return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    
    const absValue = Math.abs(numValue);
    const formatted = absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return numValue < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  // Parse currency input back to number
  const parseCurrencyInput = (value) => {
    if (!value) return '';
    // Check if negative
    const isNegative = value.includes('-');
    // Remove dollar sign, commas, spaces, and negative signs
    const cleaned = value.replace(/[$,\s-]/g, '');
    // Return with negative sign if needed
    return isNegative && cleaned ? `-${cleaned}` : cleaned;
  };

  // Generate AI suggestions for expense reduction
  const generateAISuggestions = async () => {
    if (totalExpenses === 0 || monthlyIncome === 0) {
      setAiSuggestions("Add your income and expenses to get personalized suggestions!");
      return;
    }

    setIsLoadingSuggestions(true);
    
    try {
      // Prepare expense data for AI
      const expenseData = categories.map(cat => ({
        category: cat.label,
        amount: parseFloat(expenses[cat.key]) || 0,
        percentage: monthlyIncome > 0 ? ((parseFloat(expenses[cat.key]) || 0) / monthlyIncome * 100) : 0,
        hasBreakdown: (subCategories[cat.key] || []).length > 0,
        breakdown: subCategories[cat.key] || []
      })).filter(cat => cat.amount > 0);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { 
              role: "user", 
              content: `You are a financial advisor. Analyze this monthly budget and provide 3-5 actionable, specific suggestions to reduce expenses. Be practical and encouraging.

Monthly Income (after tax): $${monthlyIncome.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Remaining: $${remaining.toFixed(2)}

Expense Breakdown:
${expenseData.map(cat => `- ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% of income)${cat.hasBreakdown ? `\n  Items: ${cat.breakdown.map(item => `${item.name} $${item.amount.toFixed(2)}`).join(', ')}` : ''}`).join('\n')}

Provide practical suggestions in a friendly, conversational tone. Focus on the highest-impact areas. Keep each suggestion to 1-2 sentences. Format as a bulleted list.`
            }
          ]
        })
      });

      const data = await response.json();
      setAiSuggestions(data.content[0].text);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setAiSuggestions("Unable to generate suggestions at this time. Please try again later.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Get expense breakdown for pie chart
  const getExpenseBreakdown = () => {
    return categories
      .map(cat => ({
        key: cat.key,
        label: cat.label,
        icon: cat.icon,
        amount: parseFloat(expenses[cat.key]) || 0,
        percentage: totalExpenses > 0 ? ((parseFloat(expenses[cat.key]) || 0) / totalExpenses * 100) : 0
      }))
      .filter(cat => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  // Pie chart colors
  const pieColors = [
    '#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#ec4899', 
    '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
    '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e'
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '40px 20px 100px 20px',
      fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@700&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        /* PWA Meta Tags */
        html {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        body {
          margin: 0;
          padding: 0;
          overscroll-behavior-y: contain;
          -webkit-overflow-scrolling: touch;
        }
        
        input, textarea {
          -webkit-user-select: text;
          user-select: text;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        .expense-input {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .expense-input:focus {
          transform: scale(1.02);
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.3);
        }
        
        .category-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .category-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        
        .stat-card {
          animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .progress-bar {
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .category-card:active {
          cursor: grabbing;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* PWA Install Banner */}
        {showInstallPrompt && (
          <div style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            animation: 'slideDown 0.5s ease-out'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#000000', fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                📱 Install App
              </div>
              <div style={{ color: '#422006', fontSize: '13px' }}>
                Add to home screen for quick access and offline use
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleInstallClick}
                style={{
                  background: '#000000',
                  color: '#fbbf24',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                style={{
                  background: 'transparent',
                  color: '#000000',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tracker Page */}
        {currentPage === 'tracker' && (
          <>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px',
          animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Wallet size={40} color="#fbbf24" />
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              fontFamily: '"Space Mono", monospace'
            }}>
              Expense Tracker
            </h1>
          </div>
          <p style={{
            color: '#94a3b8',
            fontSize: '18px',
            margin: 0
          }}>
            Track where your money goes each month
          </p>
        </div>

        {/* Income Input */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        }}>
          <label style={{
            display: 'block',
            color: '#bfdbfe',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Monthly Income (After Tax)
          </label>
          <input
            type="text"
            value={
              isIncomeFocused 
                ? incomeInputValue
                : monthlyIncome ? formatExpenseDisplay(monthlyIncome) : ''
            }
            onChange={(e) => {
              if (isIncomeFocused) {
                setIncomeInputValue(e.target.value);
              }
            }}
            onFocus={() => {
              setIsIncomeFocused(true);
              setIncomeInputValue(monthlyIncome ? monthlyIncome.toString() : '');
            }}
            onBlur={() => {
              setIsIncomeFocused(false);
              const rawValue = parseCurrencyInput(incomeInputValue);
              const cleanValue = rawValue.replace(/^0+/, '') || '0';
              const numValue = parseFloat(cleanValue) || 0;
              setMonthlyIncome(numValue);
              setIncomeInputValue('');
            }}
            placeholder="$0.00"
            style={{
              width: '100%',
              fontSize: '48px',
              fontWeight: '700',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '16px 24px',
              color: '#ffffff',
              outline: 'none',
              fontFamily: '"Space Mono", monospace'
            }}
            className="expense-input"
          />
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            animationDelay: '0.1s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <TrendingDown size={24} color="#fca5a5" />
              <span style={{ color: '#fca5a5', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Expenses
              </span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', fontFamily: '"Space Mono", monospace' }}>
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '8px' }}>
              {totalPercentage.toFixed(1)}% of income
            </div>
          </div>

          <div className="stat-card" style={{
            background: `linear-gradient(135deg, ${remaining >= 0 ? '#059669' : '#dc2626'} 0%, ${remaining >= 0 ? '#047857' : '#b91c1c'} 100%)`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            animationDelay: '0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <TrendingUp size={24} color={remaining >= 0 ? '#86efac' : '#fca5a5'} />
              <span style={{ color: remaining >= 0 ? '#86efac' : '#fca5a5', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {remaining >= 0 ? 'Remaining' : 'Overspent'}
              </span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', fontFamily: '"Space Mono", monospace' }}>
              ${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: remaining >= 0 ? '#86efac' : '#fca5a5', fontSize: '14px', marginTop: '8px' }}>
              {remaining >= 0 ? 'Available to save or spend' : 'Over budget'}
            </div>
          </div>
        </div>

        {/* Expense Categories */}
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {categories.map((category, index) => {
            const amount = parseFloat(expenses[category.key]) || 0;
            const percentage = getPercentage(expenses[category.key]);
            const isEditing = editingCategory === category.key;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            
            return (
              <div
                key={category.key}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className="category-card"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: isDragging 
                    ? '0 20px 40px -5px rgba(0, 0, 0, 0.5)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                  animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  animationDelay: `${0.3 + index * 0.05}s`,
                  animationFillMode: 'backwards',
                  opacity: isDragging ? 0.5 : 1,
                  cursor: isEditing ? 'default' : 'grab',
                  transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'none',
                  border: isDragOver ? '2px solid rgba(251, 191, 36, 0.5)' : '2px solid transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  {/* Drag Handle */}
                  {!isEditing && (
                    <div style={{
                      fontSize: '20px',
                      color: '#64748b',
                      cursor: 'grab',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      padding: '4px'
                    }}>
                      <div style={{ width: '4px', height: '4px', background: '#64748b', borderRadius: '50%' }}></div>
                      <div style={{ width: '4px', height: '4px', background: '#64748b', borderRadius: '50%' }}></div>
                      <div style={{ width: '4px', height: '4px', background: '#64748b', borderRadius: '50%' }}></div>
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '32px',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '12px'
                  }}>
                    {isGeneratingEmoji && isEditing ? '⏳' : category.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          style={{
                            flex: 1,
                            fontSize: '16px',
                            fontWeight: '500',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '2px solid rgba(251, 191, 36, 0.5)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#e2e8f0',
                            outline: 'none'
                          }}
                          autoFocus
                          disabled={isGeneratingEmoji}
                        />
                        <button
                          onClick={saveEditCategory}
                          disabled={isGeneratingEmoji}
                          style={{
                            background: isGeneratingEmoji ? '#64748b' : '#10b981',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            cursor: isGeneratingEmoji ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={16} color="#ffffff" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isGeneratingEmoji}
                          style={{
                            background: '#64748b',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            cursor: isGeneratingEmoji ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={16} color="#ffffff" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ 
                          color: '#e2e8f0', 
                          fontSize: '16px', 
                          fontWeight: '500', 
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {category.label}
                          <button
                            onClick={() => toggleSubCategories(category.key)}
                            style={{
                              background: expandedCategory === category.key ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'all 0.2s',
                              borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                            title="Add breakdown"
                          >
                            <List size={14} color={expandedCategory === category.key ? '#fbbf24' : '#94a3b8'} />
                          </button>
                          <button
                            onClick={() => startEditCategory(category)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <Edit2 size={14} color="#94a3b8" />
                          </button>
                          <button
                            onClick={() => deleteCategory(category.key)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                        
                        {/* Sub-categories display in main view */}
                        {subCategories[category.key]?.length > 0 && expandedCategory !== category.key && (
                          <div style={{ 
                            marginBottom: '6px',
                            marginTop: '4px'
                          }}>
                            {subCategories[category.key].map((item, idx) => (
                              <div 
                                key={item.id}
                                style={{ 
                                  color: '#94a3b8', 
                                  fontSize: '13px',
                                  marginBottom: idx < subCategories[category.key].length - 1 ? '2px' : '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <span style={{ color: '#64748b' }}>•</span>
                                <span style={{ flex: 1 }}>{item.name}</span>
                                <span style={{ 
                                  color: item.amount < 0 ? '#ef4444' : '#fbbf24',
                                  fontWeight: '600',
                                  fontFamily: '"Space Mono", monospace',
                                  fontSize: '12px'
                                }}>
                                  {formatExpenseDisplay(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '700' }}>
                          {percentage.toFixed(1)}% of income
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    value={
                      focusedInput === category.key 
                        ? expenses[category.key] || ''
                        : expenses[category.key] ? formatExpenseDisplay(expenses[category.key]) : ''
                    }
                    onChange={(e) => {
                      const rawValue = parseCurrencyInput(e.target.value);
                      handleExpenseChange(category.key, rawValue);
                    }}
                    onKeyPress={(e) => handleExpenseKeyPress(e, category.key)}
                    onFocus={() => setFocusedInput(category.key)}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="$0.00"
                    readOnly={subCategories[category.key]?.length > 0}
                    style={{
                      width: '180px',
                      fontSize: '24px',
                      fontWeight: '700',
                      background: subCategories[category.key]?.length > 0 
                        ? 'rgba(251, 191, 36, 0.05)' 
                        : 'rgba(251, 191, 36, 0.1)',
                      border: subCategories[category.key]?.length > 0
                        ? '2px solid rgba(251, 191, 36, 0.2)'
                        : '2px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#fbbf24',
                      outline: 'none',
                      textAlign: 'right',
                      fontFamily: '"Space Mono", monospace',
                      cursor: subCategories[category.key]?.length > 0 ? 'not-allowed' : 'text'
                    }}
                    className="expense-input"
                    title={subCategories[category.key]?.length > 0 ? 'Total calculated from breakdown items' : ''}
                  />
                </div>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      height: '100%',
                      background: percentage > 100 
                        ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                
                {isGeneratingEmoji && isEditing && (
                  <div style={{ 
                    color: '#fbbf24', 
                    fontSize: '12px', 
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    🤖 Generating new emoji...
                  </div>
                )}

                {/* Sub-categories section */}
                {expandedCategory === category.key && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        color: '#94a3b8',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Breakdown
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => toggleSubCategories(category.key)}
                          style={{
                            background: '#10b981',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
                        >
                          <Check size={14} />
                          Done
                        </button>
                        <button
                          onClick={() => toggleSubCategories(category.key)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                        >
                          <X size={16} color="#94a3b8" />
                        </button>
                      </div>
                    </div>

                    {/* Existing sub-items */}
                    {(subCategories[category.key] || []).map((item) => {
                      const isEditingThisItem = editingSubItem?.categoryKey === category.key && editingSubItem?.itemId === item.id;
                      
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            cursor: isEditingThisItem ? 'default' : 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onClick={() => !isEditingThisItem && startEditSubItem(category.key, item)}
                          onMouseOver={(e) => {
                            if (!isEditingThisItem) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isEditingThisItem) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                        >
                          {isEditingThisItem ? (
                            <>
                              <input
                                type="text"
                                value={editSubItemName}
                                onChange={(e) => setEditSubItemName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  flex: 1,
                                  fontSize: '14px',
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  border: '1px solid rgba(251, 191, 36, 0.5)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  color: '#e2e8f0',
                                  outline: 'none'
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editSubItemAmount}
                                onChange={(e) => setEditSubItemAmount(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    saveEditSubItem();
                                  }
                                }}
                                style={{
                                  width: '100px',
                                  fontSize: '14px',
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  border: '1px solid rgba(251, 191, 36, 0.5)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  color: '#fbbf24',
                                  outline: 'none',
                                  textAlign: 'right',
                                  fontFamily: '"Space Mono", monospace'
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditSubItem();
                                }}
                                style={{
                                  background: '#10b981',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Check size={14} color="#ffffff" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditSubItem();
                                }}
                                style={{
                                  background: '#64748b',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <X size={14} color="#ffffff" />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ flex: 1, color: '#cbd5e1', fontSize: '14px' }}>
                                {item.name}
                              </div>
                              <div style={{ 
                                color: item.amount < 0 ? '#ef4444' : '#fbbf24',
                                fontSize: '16px', 
                                fontWeight: '600',
                                fontFamily: '"Space Mono", monospace'
                              }}>
                                {formatExpenseDisplay(item.amount)}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubItem(category.key, item.id);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.5,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
                              >
                                <X size={14} color="#ef4444" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add new sub-item */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '12px'
                    }}>
                      <input
                        type="text"
                        value={newSubItemName}
                        onChange={(e) => setNewSubItemName(e.target.value)}
                        placeholder={getSubCategoryPlaceholder(category.label)}
                        style={{
                          flex: 1,
                          fontSize: '14px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          color: '#e2e8f0',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="text"
                        value={newSubItemAmount}
                        onChange={(e) => setNewSubItemAmount(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addSubItem(category.key);
                          }
                        }}
                        placeholder=""
                        style={{
                          width: '120px',
                          fontSize: '14px',
                          background: 'rgba(251, 191, 36, 0.1)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          color: '#fbbf24',
                          outline: 'none',
                          textAlign: 'right',
                          fontFamily: '"Space Mono", monospace'
                        }}
                      />
                      <button
                        onClick={() => addSubItem(category.key)}
                        disabled={!newSubItemName.trim() || !newSubItemAmount}
                        style={{
                          background: (newSubItemName.trim() && newSubItemAmount) ? '#10b981' : '#334155',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          cursor: (newSubItemName.trim() && newSubItemAmount) ? 'pointer' : 'not-allowed',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>

                    <div style={{
                      color: '#64748b',
                      fontSize: '11px',
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      Enter item name and amount (use negative for deductions, e.g., -100)
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category Section */}
          {isAddingCategory ? (
            <div
              className="category-card"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                border: '2px dashed rgba(251, 191, 36, 0.5)'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  fontSize: '32px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(251, 191, 36, 0.1)',
                  borderRadius: '12px'
                }}>
                  {isGeneratingEmoji ? '⏳' : '✨'}
                </div>
                <input
                  type="text"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="e.g., Streaming Subscriptions, Pet Care, Hobbies..."
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontWeight: '500',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '2px solid rgba(251, 191, 36, 0.5)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#e2e8f0',
                    outline: 'none'
                  }}
                  autoFocus
                  disabled={isGeneratingEmoji}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={isGeneratingEmoji || !newCategoryLabel.trim()}
                  style={{
                    background: isGeneratingEmoji || !newCategoryLabel.trim() ? '#64748b' : '#10b981',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    cursor: isGeneratingEmoji || !newCategoryLabel.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  <Check size={16} />
                  {isGeneratingEmoji ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryLabel('');
                  }}
                  style={{
                    background: '#64748b',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={16} color="#ffffff" />
                </button>
              </div>
              {isGeneratingEmoji && (
                <div style={{ 
                  color: '#fbbf24', 
                  fontSize: '12px', 
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  🤖 AI is picking the perfect emoji...
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                border: '2px dashed rgba(251, 191, 36, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#fbbf24',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
              }}
            >
              <Plus size={20} />
              Add Custom Category
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '48px',
          color: '#64748b',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          💡 Enter expenses or math expressions (e.g., "430 + 450 + 230") and press Enter<br/>
          ➕ Add to existing totals by typing "+ 100" and pressing Enter<br/>
          📋 Click the list icon for itemized breakdowns with separate name and amount fields<br/>
          🎯 Drag and drop categories to reorder them<br/>
          ✏️ Edit category names (emoji auto-updates!) • 🗑️ Delete categories • ✨ Add custom categories<br/>
          <div style={{ marginTop: '8px', color: '#475569', fontSize: '12px', fontStyle: 'italic' }}>
            💾 Your data is automatically saved in your browser
          </div>
        </div>
          </>
        )}

        {/* Insights Page */}
        {currentPage === 'insights' && (
          <>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '48px',
              animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <PieChart size={40} color="#fbbf24" />
                <h1 style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                  fontFamily: '"Space Mono", monospace'
                }}>
                  Spending Insights
                </h1>
              </div>
              <p style={{
                color: '#94a3b8',
                fontSize: '18px',
                margin: 0
              }}>
                Visualize and optimize your budget
              </p>
            </div>

            {getExpenseBreakdown().length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b'
              }}>
                <PieChart size={64} color="#475569" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>No Expenses Yet</h3>
                <p>Go to the Tracker tab to add your expenses and see insights here!</p>
              </div>
            ) : (
              <>
                {/* Pie Chart */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  padding: '32px',
                  marginBottom: '32px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}>
                  <h2 style={{
                    color: '#e2e8f0',
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '32px',
                    textAlign: 'center'
                  }}>
                    Expense Breakdown
                  </h2>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '32px'
                  }}>
                    {/* Actual Pie Chart */}
                    <svg width="300" height="300" viewBox="0 0 300 300" style={{ marginBottom: '20px' }}>
                      {(() => {
                        const breakdown = getExpenseBreakdown();
                        let currentAngle = -90; // Start at top
                        
                        return breakdown.map((cat, index) => {
                          const percentage = cat.percentage;
                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          
                          // Convert to radians
                          const startRad = (startAngle * Math.PI) / 180;
                          const endRad = (endAngle * Math.PI) / 180;
                          
                          // Calculate path
                          const x1 = 150 + 120 * Math.cos(startRad);
                          const y1 = 150 + 120 * Math.sin(startRad);
                          const x2 = 150 + 120 * Math.cos(endRad);
                          const y2 = 150 + 120 * Math.sin(endRad);
                          
                          const largeArc = angle > 180 ? 1 : 0;
                          
                          const pathData = [
                            `M 150 150`,
                            `L ${x1} ${y1}`,
                            `A 120 120 0 ${largeArc} 1 ${x2} ${y2}`,
                            `Z`
                          ].join(' ');
                          
                          currentAngle = endAngle;
                          
                          return (
                            <g key={cat.key}>
                              <path
                                d={pathData}
                                fill={pieColors[index % pieColors.length]}
                                stroke="#1e293b"
                                strokeWidth="2"
                              />
                              {percentage > 5 && (
                                <text
                                  x={150 + 80 * Math.cos((startRad + endRad) / 2)}
                                  y={150 + 80 * Math.sin((startRad + endRad) / 2)}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#000000"
                                  fontSize="14"
                                  fontWeight="700"
                                  fontFamily='"Space Mono", monospace'
                                >
                                  {cat.percentage.toFixed(0)}%
                                </text>
                              )}
                            </g>
                          );
                        });
                      })()}
                      {/* Center circle for donut effect */}
                      <circle cx="150" cy="150" r="60" fill="#1e293b" />
                      <text
                        x="150"
                        y="145"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="14"
                        fontWeight="600"
                      >
                        Total
                      </text>
                      <text
                        x="150"
                        y="165"
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="18"
                        fontWeight="700"
                        fontFamily='"Space Mono", monospace'
                      >
                        ${totalExpenses.toFixed(0)}
                      </text>
                    </svg>

                    {/* Bar chart breakdown */}
                    <div style={{ width: '100%', maxWidth: '600px' }}>
                      {getExpenseBreakdown().map((cat, index) => (
                        <div key={cat.key} style={{ marginBottom: '20px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                {cat.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{
                                color: '#fbbf24',
                                fontSize: '16px',
                                fontWeight: '700',
                                fontFamily: '"Space Mono", monospace'
                              }}>
                                ${cat.amount.toFixed(2)}
                              </span>
                              <span style={{
                                color: pieColors[index % pieColors.length],
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${cat.percentage}%`,
                              height: '100%',
                              background: pieColors[index % pieColors.length],
                              borderRadius: '6px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Spender */}
                {getExpenseBreakdown().length > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '32px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                  }}>
                    <h3 style={{
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      🔥 Biggest Expense
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '32px' }}>{getExpenseBreakdown()[0].icon}</span>
                      <div>
                        <div style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '4px' }}>
                          {getExpenseBreakdown()[0].label}
                        </div>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '24px',
                          fontWeight: '700',
                          fontFamily: '"Space Mono", monospace'
                        }}>
                          ${getExpenseBreakdown()[0].amount.toFixed(2)}
                        </div>
                        <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>
                          {((getExpenseBreakdown()[0].amount / monthlyIncome) * 100).toFixed(1)}% of your monthly income
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  borderRadius: '20px',
                  padding: '32px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                  }}>
                    <h2 style={{
                      color: '#e2e8f0',
                      fontSize: '24px',
                      fontWeight: '700',
                      margin: 0
                    }}>
                      💡 AI Savings Suggestions
                    </h2>
                    <button
                      onClick={generateAISuggestions}
                      disabled={isLoadingSuggestions}
                      style={{
                        background: isLoadingSuggestions ? '#64748b' : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        color: '#000000',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isLoadingSuggestions ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      {isLoadingSuggestions ? 'Analyzing...' : 'Get Suggestions'}
                    </button>
                  </div>

                  {aiSuggestions ? (
                    <div style={{
                      color: '#cbd5e1',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {aiSuggestions}
                    </div>
                  ) : (
                    <div style={{
                      color: '#64748b',
                      fontSize: '15px',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '20px'
                    }}>
                      Click "Get Suggestions" to receive personalized tips for reducing your expenses
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(251, 191, 36, 0.2)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '60px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setCurrentPage('tracker')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 20px',
            transition: 'all 0.3s'
          }}
        >
          <CreditCard
            size={24}
            color={currentPage === 'tracker' ? '#fbbf24' : '#64748b'}
            style={{ transition: 'all 0.3s' }}
          />
          <span style={{
            color: currentPage === 'tracker' ? '#fbbf24' : '#64748b',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s'
          }}>
            Tracker
          </span>
        </button>

        <button
          onClick={() => setCurrentPage('insights')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 20px',
            transition: 'all 0.3s'
          }}
        >
          <PieChart
            size={24}
            color={currentPage === 'insights' ? '#fbbf24' : '#64748b'}
            style={{ transition: 'all 0.3s' }}
          />
          <span style={{
            color: currentPage === 'insights' ? '#fbbf24' : '#64748b',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s'
          }}>
            Insights
          </span>
        </button>
      </div>
    </div>
  );
}
