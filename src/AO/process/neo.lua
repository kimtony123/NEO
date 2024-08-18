local json = require("json")
local math = require("math")

_0RBIT = "BaMK1dfayo75s3q1ow6AO64UDpD9SEFbeE8xYrY2fyQ"
_0RBT_TOKEN = "BUhZLMwQ6yZHguLtJYA5lLUa9LQzLXMXRfaq9FVcPJc"

BASE_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&locale=en"
FEE_AMOUNT = "1000000000000" -- 1 $0RBT

TOKEN_PRICES = TOKEN_PRICES or {}
balances = balances or {}
-- Data storage
users = users or {}
-- Table to track addresses that have requested tokens
RequestedAddresses = RequestedAddresses or {}
-- Data storage for transactions
transactions = transactions or {}
openTrades = openTrades or {}
expiredTrades = expiredTrades or {}
closedTrades = closedTrades or {}
winners = winners or {}
Profits = Profits or {}
ArchivedTrades = ArchivedTrades or {}
WinnersList = WinnersList or {}
-- Initialize transaction ID counter
transactionCounter = transactionCounter or 0

-- Callback function for fetch price
fetchPriceCallback = nil


-- Credentials token
NOT = "wPmY5MO0DPWpgUGGj8LD7ZmuPmWdYZ2NnELeXdGgctQ"
USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";




function fetchPrice(callback)
    local url = BASE_URL

    Send({
        Target = _0RBT_TOKEN,
        Action = "Transfer",
        Recipient = _0RBIT,
        Quantity = FEE_AMOUNT,
        ["X-Url"] = url,
        ["X-Action"] = "Get-Real-Data"
    })

    print("GET Request sent to the 0rbit process.")

    -- Save the callback to be called later
    fetchPriceCallback = callback
end

function receiveData(msg)
    local res = json.decode(msg.Data)

    for i, coin in ipairs(res) do
        TOKEN_PRICES[coin.symbol] = {
            id = coin.id,
            name = coin.name,
            symbol = coin.symbol,
            current_price = coin.current_price
        }
    end

    -- Printing the filtered data for verification
    for symbol, coin in pairs(TOKEN_PRICES) do
        print("ID: " .. coin.id .. ", Name: " .. coin.name .. ", Symbol: " .. coin.symbol .. ", Current Price: " .. coin.current_price)
    end

    -- Call the callback if it exists
    if fetchPriceCallback then
        fetchPriceCallback()
        fetchPriceCallback = nil -- Clear the callback after calling
    end
end

function getTokenPrice(token)
    local token_data = TOKEN_PRICES[token]

    if not token_data or not token_data.current_price then
        return nil
    else
        return token_data.current_price
    end
end

function processExpiredContracts(msg)
    -- Convert the incoming timestamp to a number
    currentTime = tonumber(msg.Timestamp)
    print("Starting to process expired contracts at time:", currentTime)

    -- Check if the expiredTrades list is empty and exit early if it is
    if next(expiredTrades) == nil then
        print("No expired trades to process.")
        return
    end

    -- Define a function to process expired trades after fetching prices
    local function processTrades()
        for tradeId, trade in pairs(expiredTrades) do
            print("Processing tradeId:", tradeId)
            
            -- Fetch the latest price for the asset
            fetchPrice()
            
            -- Get the token price using the trade's AssetId
            local closingPrice = getTokenPrice(trade.AssetId)
            if closingPrice then
                -- Update the trade with the closing price and current time
                trade.ClosingPrice = closingPrice
                trade.ClosingTime = currentTime
                print("Updated trade:", tradeId, "with ClosingPrice:", closingPrice, "and ClosingTime:", currentTime)
                
                -- Check if the trade is a winner
                if checkTradeWinner(trade, closingPrice) then
                    winners[tradeId] = trade
                else
                    trade.Outcome = "lost"
                    closedTrades[tradeId] = trade
                    ArchivedTrades[tradeId] = trade
                    -- Set the expired trade to nil after processing
                    expiredTrades[tradeId] = nil
                end
            else
                print("Error: No closing price found for trade:", tradeId, "with AssetId:", trade.AssetId)
            end

            -- Ensure that the trade has a valid closing price before proceeding
            if not trade.ClosingPrice then
                print("Skipping tradeId:", tradeId, "due to nil ClosingTime.")
            end
        end
    end

    -- Call the function to process trades
    processTrades()

    -- Confirm that sendRewards function is called
    print("Calling sendRewards function")
    sendRewards()

    -- Print the final state of expiredTrades
    print("Final state of expiredTrades:")
    for tradeId, trade in pairs(expiredTrades) do
        print("TradeId: " .. tradeId .. ", Trade: " .. tostring(trade))
    end
end



function tableToJson(tbl)
    local result = {}
    for key, value in pairs(tbl) do
        local valueType = type(value)
        if valueType == "table" then
            value = tableToJson(value)
            table.insert(result, string.format('"%s":%s', key, value))
        elseif valueType == "string" then
            table.insert(result, string.format('"%s":"%s"', key, value))
        elseif valueType == "number" then
            table.insert(result, string.format('"%s":%d', key, value))
        elseif valueType == "function" then
            table.insert(result, string.format('"%s":"%s"', key, tostring(value)))
        end
    end

    local json = "{" .. table.concat(result, ",") .. "}"
    return json
end

-- Check Expired Contracts Handler Function
function checkExpiredContracts(msg)
    currentTime = tonumber(msg.Timestamp)
    print(currentTime)
    for tradeId, trade in pairs(openTrades) do
        local contractExp = tonumber(trade.ContractExpiry)
        if currentTime >= contractExp then
            trade.ContractStatus = "Expired"
            expiredTrades[tradeId] = trade
            openTrades[tradeId] = nil
        end
    end
end

-- Function to check if the trade is a winner
function checkTradeWinner(trade, closingPrice)
    local winner = false
    if trade.ContractType == "Call" and closingPrice > tonumber(trade.AssetPrice) then
        winner = true
    elseif trade.ContractType == "Put" and closingPrice < tonumber(trade.AssetPrice) then
        winner = true
    end
    return winner
end

function sendRewards()
    -- Print initial state of winners
    print("Initial state of winners:")
    for _, winner in pairs(winners) do
        print("Winner UserId: " .. winner.UserId .. ", TradeId: " .. winner.TradeId .. ", Payout: " .. tostring(winner.Payout) .. ", BetAmount: " .. tostring(winner.BetAmount))
    end

    -- Process rewards for winners
    for tradeId, winner in pairs(winners) do
        if winner.Payout then
            local payout = winner.Payout * winner.BetAmount
            ao.send({
                Target = USDA,
                Action = "Transfer",
                Quantity = tostring(payout),
                Recipient = tostring(winner.UserId)
            })

            -- Update the trade outcome to "won"
            winner.Outcome = "won"
            closedTrades[tradeId] = winner
            ArchivedTrades[tradeId] = winner
            print("TradeId " .. tradeId .. " marked as won and moved to closedTrades.")
            
            -- Set expired trade to nil after processing
            expiredTrades[tradeId] = nil
        else
            print("Skipping reward for winner with nil Payout.")
        end
    end

    -- Clear the winners table after processing rewards
    winners = {}

    -- Print final state of closedTrades
    print("Final state of closedTrades:")
    for tradeId, trade in pairs(closedTrades) do
        print("TradeId: " .. tradeId .. ", Outcome: " .. tostring(trade.Outcome))
    end
end

function ClearClosedTrades(userId)
    -- Table to store trades that the user can clear
    local userTrades = {}

    for tradeId, trade in pairs(closedTrades) do
        if trade.UserId == userId then
            userTrades[tradeId] = trade
            ArchivedTrades[tradeId] = trade
        end
    end

    -- Remove cleared trades from closedTrades
    for tradeId in pairs(userTrades) do
        closedTrades[tradeId] = nil
    end

    print("Archived closed trades for user: " .. tostring(userId))
end



-- Function to deposit funds
function deposit(user, amount)
    balances[user] = (balances[user] or 0) + amount
    print(user .. " deposited " .. amount .. ". New balance: " .. balances[user])
end


-- Function to withdraw funds
function withdraw(user, amount)
    -- Check if the user has a balance and if it is sufficient
    if balances[user] and balances[user] > 0 then
        if balances[user] >= amount then
            -- Deduct the amount from the user's balance
            balances[user] = balances[user] - amount
            print(user .. " withdrew " .. amount .. ". New balance: " .. balances[user])

            -- Send confirmation message to the user
            ao.send({
                Target = user,
                Data = "Successfully Withdrawn. New balance: " .. balances[user] / 1000000000000
            })

            return true -- Withdrawal successful
        else
            print("Insufficient balance for " .. user)
            ao.send({
                Target = user,
                Data = "Insufficient balance. Current balance: " .. balances[user] / 1000000000000
            })
            return false -- Withdrawal failed due to insufficient funds
        end
    else
        -- Handle the case where the user has no balance or a balance of 0
        print("Insufficient balance for " .. user)
        ao.send({
            Target = user,
            Data = "Insufficient balance. Current balance: 0"
        })
        return false -- Withdrawal failed due to 0 balance
    end
end


-- Function to generate a unique transaction ID
function generateTransactionId()
    transactionCounter = transactionCounter + 1
    return "TX" .. tostring(transactionCounter)
end


-- Function to get the current time in milliseconds
function getCurrentTime(msg)
    return msg.Timestamp  -- returns time in milliseconds
end


Handlers.add(
    "GetTokenPrice",
    Handlers.utils.hasMatchingTag("Action", "Get-Token-Price"),
    function(m)
        local token = m.Tags.Token
        local current_price = getTokenPrice(token)

        if not current_price then
            Handlers.utils.reply("Price not available!!!")(m)
        else
            Handlers.utils.reply("Current Price: " .. tostring(current_price))(m)
        end
    end
)

Handlers.add(
    "FetchPrice",
    Handlers.utils.hasMatchingTag("Action", "Fetch-Price"),
    function(m)
        fetchPrice(m)
    end
)


Handlers.add(
    "reward",
    Handlers.utils.hasMatchingTag("Action", "reward"),
 sendRewards
)

Handlers.add(
    "ReceiveData",
    Handlers.utils.hasMatchingTag("Action", "Receive-Response"),
    receiveData
)

Handlers.add(
    "completeTrade",
    Handlers.utils.hasMatchingTag("Action", "completeTrade"),
    function(m)
        processExpiredContracts(m)
    end

)

Handlers.add(
    "checkContract",
    Handlers.utils.hasMatchingTag("Action", "checkContract"),
        checkExpiredContracts)

Handlers.add(
    "trade",
    Handlers.utils.hasMatchingTag("Action", "trade"),
    function(m)
        currentTime = getCurrentTime(m)
        if m.Tags.TradeId and m.Tags.CreatedTime and m.Tags.AssetId and m.Tags.AssetPrice and m.Tags.ContractType
            and m.Tags.ContractStatus and m.Tags.ContractExpiry and m.Tags.BetAmount and m.Tags.Payout then
            -- Convert BetAmount and ContractExpiry to numbers
            local qty = tonumber(m.Tags.BetAmount)
            local contractExpiry = tonumber(m.Tags.ContractExpiry)

            -- Check if qty or contractExpiry is nil and handle the error
            if qty == nil then
                print("Error: BetAmount is not a valid number.")
                ao.send({ Target = m.From, Data = "Invalid BetAmount. It must be a number." })
                return
            end

            if contractExpiry == nil then
                print("Error: ContractExpiry is not a valid number.")
                ao.send({ Target = m.From, Data = "Invalid ContractExpiry. It must be a number." })
                return
            end

            -- Validate qty is a number
            assert(type(qty) == 'number', 'Quantity Tag must be a number')

            -- Validate contractExpiry is a number and not less than 5
            assert(type(contractExpiry) == 'number', 'ContractExpiry Tag must be a number')
            if contractExpiry < 5 then
                print("Error: ContractExpiry must be at least 5 minutes.")
                ao.send({ Target = m.From, Data = "Invalid ContractExpiry. It must be at least 5 minutes." })
                return
            end

            -- Check if qty is positive
            if qty <= 0 then
                print("Error: BetAmount must be a positive number.")
                ao.send({ Target = m.From, Data = "Invalid BetAmount. It must be a positive number." })
                return
            end

            -- Check if qty is within the allowed range
            if qty > 500000000000 and qty < 20000000000000 then

                if balances[m.From] and balances[m.From] >= qty then
                balances[m.From] = balances[m.From] - qty
                print(m.From .. " Bet " .. qty .. ". New balance: " .. balances[m.From])
                local outcome = tostring("pending")
                openTrades[m.Tags.TradeId] = {
                    UserId = m.From,
                    TradeId = m.Tags.TradeId,
                    Name = m.Tags.Name,
                    AssetId = m.Tags.AssetId,
                    AssetPrice = m.Tags.AssetPrice,
                    ContractType = m.Tags.ContractType,
                    ContractStatus = m.Tags.ContractStatus,
                    CreatedTime = currentTime,
                    ContractExpiry = currentTime + (contractExpiry * 60 * 1000), -- Convert minutes to milliseconds
                    BetAmount = qty,
                    Payout = m.Tags.Payout,
                    Outcome = outcome -- Initialize outcome as nil
                }
                print("Trades table after update: " .. tableToJson(openTrades))
                ao.send({ Target = m.From, Data = "Successfully Created Trade" })
                else
                ao.send({ Target = m.From, Data = "Insufficient Balance to place Trade." })
                end
                
            else
                -- Print error message for invalid quantity
                print("Invalid quantity: " .. qty .. ". Must be more than 1 and less than 200000.")
                ao.send({ Target = m.From, Data = "Invalid quantity. Must be more than 1 and less than 200000." })
            end
        else
            -- Print error message for missing tags
            print("Missing required tags for trade creation.")
            ao.send({ Target = m.From, Data = "Missing required tags for trade creation." })
        end
    end
)



Handlers.add(
    "openTrades",
    Handlers.utils.hasMatchingTag("Action", "openTrades"),
    function(m)
        local filteredTrades = {}
        for tradeId, trade in pairs(openTrades) do
            if trade.UserId == m.From then
                filteredTrades[tradeId] = trade
            end
        end
        ao.send({ Target = m.From, Data = tableToJson(filteredTrades) })
    end
)

Handlers.add(
    "closedTrades",
    Handlers.utils.hasMatchingTag("Action", "closedTrades"),
    function(m)
        -- Print the entire closedTrades table as a string for debugging
        print("Debugging closedTrades table:")
        print(closedTrades, {comment = false})

        -- Create a new table to store valid trades
        local validTrades = {}
        for tradeId, trade in pairs(closedTrades) do
            if trade.UserId == m.From then
                local status, result = pcall(function() return tableToJson(trade) end)
                if status then
                    validTrades[tradeId] = trade
                    print("Successfully converted tradeId: " .. tostring(tradeId) .. " to JSON.")
                else
                    print("Error converting tradeId: " .. tostring(tradeId) .. " to JSON. Skipping this trade.")
                end
            end
        end

        -- Convert validTrades to JSON and send it
        local jsonData = tableToJson(validTrades)
        ao.send({ Target = m.From, Data = jsonData })
    end
)



Handlers.add(
    "ClearWinners",
    Handlers.utils.hasMatchingTag("Action", "ClearWinners"),
    function(m)
        winners = {}
        print("winners  have been cleared.")
    end
)


-- Handler to clear closedTrades
Handlers.add(
    "ClearClosedTrades",
    Handlers.utils.hasMatchingTag("Action", "ClearClosed"),
    function(m)
        ClearClosedTrades(m)
    end
)

Handlers.add(
  "CronTick", -- handler name
  Handlers.utils.hasMatchingTag("Action", "Cron"), -- handler pattern to identify cron message
    checkExpiredContracts,
    function(m)
        processExpiredContracts(m)
    end
)

-- Handler to respond to ArchivedTrades request
Handlers.add(
    "getArchivedTrades",
    Handlers.utils.hasMatchingTag("Action", "getArchivedTrades"),
    function(m)
        -- Send the openTrades data back to the requesting process
        ao.send({
            Target = m.From, -- Reply to the sender
            Action = "archivedTradesResponse",
            Data = json.encode(ArchivedTrades)
        })
    end
)

-- Handler to respond to openTrades request
Handlers.add(
    "getOpenTrades",
    Handlers.utils.hasMatchingTag("Action", "getOpenTrades"),
    function(m)
        -- Send the openTrades data back to the requesting process
        ao.send({
            Target = m.From, -- Reply to the sender
            Action = "openTradesResponse",
            Data = json.encode(openTrades)
        })
    end
)

-- Handler for deposit
Handlers.add(
    "deposit",
    Handlers.utils.hasMatchingTag("Action", "deposit"),
    function(m)
        if m.Tags.Amount then
            local user = m.From
            local amount = tonumber(m.Tags.Amount)   
            if amount <= 0 then
            print("Deposit amount must be positive.")
            return
            end
            print("amount:"..amount)
        deposit(user, amount)
            ao.send({ Target = m.From, Data = "Sucessfully Deposited. New balance" .. balances[user] / 1000000000000 })
            
            currentTime = getCurrentTime(m)
            local transactionId = generateTransactionId()
            -- Record the transaction
            table.insert(transactions, {
            user = user,
            transactionid = transactionId,
            type = "deposit",
            amount = amount,
            balance = balances[user],
            timestamp = currentTime
            })
        end 
    end
)

-- Handler for withdrawal
Handlers.add(
    "withdraw",
    Handlers.utils.hasMatchingTag("Action", "withdraw"),
    function(m)
        if m.Tags.Amount then
            local user = m.From
            local amount = tonumber(m.Tags.Amount)
            local success = withdraw(user, amount)
            
            if success then
                -- Only send transfer if withdrawal was successful
                ao.send({
                    Target = USDA,
                    Action = "Transfer",
                    Quantity = tostring(amount),
                    Recipient = tostring(m.From)
                })
                currentTime = getCurrentTime(m)
                local transactionId = generateTransactionId()
                -- Record the transaction
                table.insert(transactions, {
                    user = user,
                    transactionid = transactionId,
                    type = "withdrawal",
                    amount = amount,
                    balance = balances[user],
                    timestamp = currentTime
                })
            else
                ao.send({ Target = m.From, Data = "Withdrawal failed due to insufficient funds. Current balance: " .. balances[user]/1000000000000 })
            end
        end  
    end
)

Handlers.add('balance', Handlers.utils.hasMatchingTag('Action', 'Balance'),
function(m)
    local bal = '0'
    
    -- If not Target is provided, then return the Senders balance
    if (m.Tags.Target and balances[m.Tags.Target]) then
        bal = tostring(balances[m.Tags.Target])
    elseif balances[m.From] then
        bal = tostring(balances[m.From])
    end
    
    ao.send({
        Target = m.From,
        Tags = { Target = m.From, Balance = bal, Ticker = Ticker, Data = json.encode(tonumber(bal)) }
    })
    end)

-- Handler to view all transactions
Handlers.add(
    "view_transactions",
    Handlers.utils.hasMatchingTag("Action", "view_transactions"),
    function(m)
        local user = m.From
        local user_transactions = {}
        
        -- Filter transactions for the specific user
        for _, transaction in ipairs(transactions) do
            -- Skip nil transactions
            if transaction ~= nil and transaction.user == user then
                table.insert(user_transactions, transaction)
            end
        end
        
        -- Send the filtered transactions back to the user
        ao.send({ Target = user, Data = tableToJson(user_transactions) })
    end
)
