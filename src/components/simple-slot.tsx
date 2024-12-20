"use client"

import React, { useState, useContext } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Play, Info } from 'lucide-react'
import { UserContext } from '@/contexts/user-context'

// Define symbols and their properties
const SYMBOLS = [
  { id: '💎', name: 'diamond', multiplier: 50, color: 'text-blue-400' },
  { id: '🏺', name: 'amphora', multiplier: 25, color: 'text-yellow-400' },
  { id: '⚡', name: 'lightning', multiplier: 15, color: 'text-yellow-300' },
  { id: '🏛️', name: 'temple', multiplier: 10, color: 'text-gray-300' },
  { id: '👑', name: 'crown', multiplier: 5, color: 'text-yellow-500' },
]

const REELS = 5
const ROWS = 3

const PAYLINES = [
  { name: 'Top Row', positions: [[0,0], [1,0], [2,0], [3,0], [4,0]], color: 'border-red-500' },
  { name: 'Middle Row', positions: [[0,1], [1,1], [2,1], [3,1], [4,1]], color: 'border-blue-500' },
  { name: 'Bottom Row', positions: [[0,2], [1,2], [2,2], [3,2], [4,2]], color: 'border-green-500' },
]

export default function SimpleSlot() {
  const { balance, updateBalance, canBet } = useContext(UserContext)
  const [reels, setReels] = useState<string[][]>(Array(REELS).fill(Array(ROWS).fill('❓')))
  const [spinning, setSpinning] = useState(false)
  const [bet, setBet] = useState(1)
  const [_win, setWin] = useState(0)
  const [message, setMessage] = useState('')
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [showHelp, setShowHelp] = useState(false)

  const spin = async () => {
    if (!canBet(bet)) {
      setMessage('Insufficient balance')
      return
    }

    setSpinning(true)
    setMessage('')
    setWinningLines([])

    try {
      // Generate outcome
      const finalReels = generateRandomReels()
      const { winAmount, winningPaylines } = calculateWin(finalReels, bet)
      const newBalance = balance + winAmount - bet

      // Send to backend
      const response = await fetch('/api/games/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bet,
          outcome: winAmount > 0 ? 'win' : 'lose',
          winAmount,
          finalBalance: newBalance
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process game')
      }

      const data = await response.json()
      
      // Update UI
      setReels(finalReels)
      setWin(winAmount)
      setWinningLines(winningPaylines)
      
      // Update balance using the server response
      if (data.balance !== undefined) {
        updateBalance(data.balance)
      }
      
      if (winAmount > 0) {
        setMessage(`Win! ${winAmount} TND on ${winningPaylines.length} line${winningPaylines.length > 1 ? 's' : ''}!`)
      } else {
        setMessage('Try again!')
      }
    } catch (error) {
      console.error('Game error:', error)
      setMessage('An error occurred')
    } finally {
      setSpinning(false)
    }
  }

  const generateRandomReels = () => {
    return Array(REELS).fill(null).map(() =>
      Array(ROWS).fill(null).map(() =>
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id
      )
    )
  }

  const calculateWin = (currentReels: string[][], currentBet: number) => {
    let totalWin = 0
    const winningPaylines: number[] = []

    // Check each payline
    PAYLINES.forEach((payline, index) => {
      const symbols = payline.positions.map(([x, y]) => currentReels[x][y])
      const matches = findMatches(symbols)
      if (matches >= 3) {
        winningPaylines.push(index)
        const symbol = symbols[0]
        const multiplier = SYMBOLS.find(s => s.id === symbol)?.multiplier || 1
        totalWin += multiplier * currentBet * (matches - 2)
      }
    })

    return { winAmount: totalWin, winningPaylines }
  }

  const findMatches = (symbols: string[]) => {
    const firstSymbol = symbols[0]
    let matches = 1
    
    for (let i = 1; i < symbols.length; i++) {
      if (symbols[i] === firstSymbol) {
        matches++
      } else {
        break
      }
    }
    
    return matches
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-4">
      <Card className="max-w-3xl mx-auto bg-purple-800 border-2 border-yellow-600">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">
              Olympic Treasures
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="text-white hover:bg-purple-700"
            >
              <Info className="w-4 h-4 mr-2" />
              How to Play
            </Button>
          </div>

          {showHelp && (
            <Card className="bg-purple-700 text-white p-4 mb-4">
              <h2 className="font-bold mb-2">How to Win:</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Match 3 or more identical symbols on any payline</li>
                <li>Paylines run left to right on each row</li>
                <li>More matching symbols = bigger wins!</li>
                <li>💎 Diamond pays the highest (50x)</li>
                <li>Wins are multiplied by your bet amount</li>
              </ul>
            </Card>
          )}

          {/* Game grid */}
          <div className="grid grid-cols-5 gap-2 bg-black p-4 rounded-lg mb-4">
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="space-y-2">
                {reel.map((symbol, symbolIndex) => {
                  const isPartOfWinningLine = winningLines.some(line => 
                    PAYLINES[line].positions.some(([x, y]) => x === reelIndex && y === symbolIndex)
                  )
                  return (
                    <motion.div
                      key={`${reelIndex}-${symbolIndex}`}
                      className={`h-20 w-20 bg-purple-900 rounded-lg flex items-center justify-center text-4xl
                        ${isPartOfWinningLine ? 'ring-4 ring-yellow-400' : ''}
                        transition-all duration-300`}
                      animate={spinning ? {
                        y: [0, -10, 0],
                        transition: { repeat: Infinity, duration: 0.2 }
                      } : {}}
                    >
                      {symbol}
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Paylines visualization */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PAYLINES.map((payline, index) => (
              <div 
                key={payline.name}
                className={`text-white text-sm border-l-4 pl-2 ${payline.color} ${winningLines.includes(index) ? 'bg-purple-700' : ''}`}
              >
                {payline.name}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <Button
                onClick={() => setBet(Math.max(1, bet - 1))}
                disabled={spinning}
                variant="outline"
              >
                -
              </Button>
              <span className="text-white px-4">Bet: {bet} TND</span>
              <Button
                onClick={() => setBet(Math.min(100, bet + 1))}
                disabled={spinning}
                variant="outline"
              >
                +
              </Button>
            </div>

            <Button
              onClick={spin}
              disabled={spinning || !canBet(bet)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {spinning ? (
                <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Spin
            </Button>
          </div>

          {/* Message and balance */}
          <div className="mt-4 text-center text-white">
            <p className="text-xl font-bold">{message}</p>
            <p className="mt-2">Balance: {balance} TND</p>
          </div>

          {/* Paytable */}
          <div className="mt-6 bg-purple-900 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-2">Paytable</h2>
            <div className="grid grid-cols-2 gap-4">
              {SYMBOLS.map(symbol => (
                <div key={symbol.name} className={`flex items-center justify-between ${symbol.color} p-2 rounded bg-purple-800`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{symbol.id}</span>
                    <span className="font-bold">{symbol.name}</span>
                  </div>
                  <div className="font-bold">
                    <span>x{symbol.multiplier}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
