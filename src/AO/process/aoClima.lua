local json = require("json")
local math = require("math")

_0RBIT = "BaMK1dfayo75s3q1ow6AO64UDpD9SEFbeE8xYrY2fyQ"
_0RBT_TOKEN = "BUhZLMwQ6yZHguLtJYA5lLUa9LQzLXMXRfaq9FVcPJc"
FEE_AMOUNT = "1000000000000" -- 1 $0RBT

balances = balances or {}
-- Data storage for transactions
transactions = transactions or {}
ArchivedTrades = ArchivedTrades or {}
WinnersList = WinnersList or {}
-- Table to store weather data
WEATHER_DATA = WEATHER_DATA or  {}
-- Table to track addresses that have requested tokens
RequestedAddresses = RequestedAddresses or {}
openTrades = openTrades or {}
expiredTrades = expiredTrades or {}
closedTrades = closedTrades or {}
winners = winners or {}
Profits = Profits or {}
ReceivedData = ReceivedData or {}
-- Initialize transaction ID counter
transactionCounter = transactionCounter or 0

-- Callback function for fetch price
fetchPriceCallback = nil


-- Credentials token
NOT = "wPmY5MO0DPWpgUGGj8LD7ZmuPmWdYZ2NnELeXdGgctQ"
USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";


function fetchPrice(callback, City)   
    local city = City
    local url = "https://api.openweathermap.org/data/2.5/weather?q="..city.."&appid=a2f4db644e9107746535b0d2ca43b85d&units=metric"

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


function getTokenPrice(token)
    -- Access the data using the token as the key
    local token_data = ReceivedData[token]

    if not token_data or not token_data.main or not token_data.main.temp then
        print("No temperature data found for token:", token)
        return nil
    else
        print("Returning temperature for token:", token, "Temperature:", token_data.main.temp)
        return token_data.main.temp
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
             City = trade.City

            -- Fetch the latest temperature for the city
            fetchPrice(function()
            end, City)
        end
    end
    -- Call the function to process trades
    processTrades()
end



function ClosePositions()
    -- Print the entire ReceivedData table for inspection
    print("ReceivedData:", ReceivedData)

    -- Check if the expiredTrades list is empty and exit early if it is
    if next(expiredTrades) == nil then
        print("No expired trades to process.")
        return
    end
    -- Check for matches in the expiredTrades table
    for tradeId, trade in pairs(expiredTrades) do
        -- Access the corresponding city data in ReceivedData using Trade.City
        local cityData = ReceivedData[trade.City]

        if cityData then
            local cityName = cityData.name
            local closingTemp = cityData.temp
            local closingTime = cityData.dt

            if trade.City == cityName then
                trade.ClosingTemp = closingTemp
                trade.ClosingTime = closingTime
                -- Log the update
                print("TradeId " .. tradeId .. " updated with ClosingTemp: " .. closingTemp .. " and ClosingTime: " .. closingTime)

                -- Determine if the trade is a winner or not
                local isWinner = checkTradeWinner(trade, closingTemp)
                if isWinner then
                    winners[tradeId] = trade
                    print("TradeId " .. tradeId .. " added to winners.")
                else
                    trade.Outcome = "lost"
                    closedTrades[tradeId] = trade
                    ArchivedTrades[tradeId] = trade
                    print("TradeId " .. tradeId .. " added to closedTrades and ArchivedTrades with outcome 'lost'.")
                end

                -- Set the expired trade to nil after processing
                expiredTrades[tradeId] = nil
                print("TradeId " .. tradeId .. " removed from expiredTrades.")
            end
        else
            print("No matching city data found for tradeId " .. tradeId)
        end
    end

    -- Empty the ReceivedData table
    ReceivedData = {}
    print("ReceivedData table cleared.")
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
function checkTradeWinner(trade, closingTemp)
    local winner = false
    if trade.ContractType == "Call" and closingTemp > tonumber(trade.CurrentTemp) then
        winner = true
    elseif trade.ContractType == "Put" and closingTemp < tonumber(trade.CurrentTemp) then
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

    -- Check if there are any winners or expired trades to process
    if not winners or #winners == 0 then
        print("No winners to process.")
        return
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

            -- Ensure balances[winner.UserId] is initialized to 0 if it's nil
            balances[winner.UserId] = (balances[winner.UserId] or 0) + payout
            print("Transferred: " .. payout .. " successfully to " .. winner.UserId)

            -- Update the trade outcome to "won"
            winner.Outcome = "won"
            closedTrades[tradeId] = winner
            print("TradeId " .. tradeId .. " marked as won and moved to closedTrades.")
        else
            print("Skipping reward for winner with nil Payout.")
        end
    end

    -- Print final state of closedTrades
    print("Final state of closedTrades:")
    for tradeId, trade in pairs(closedTrades) do
        print("TradeId: " .. tradeId .. ", Outcome: " .. tostring(trade.Outcome))
    end

    -- Clear winners table after sending rewards
    winners = {}
    print("Cleared winners table.")
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

-- Function to get the current time in milliseconds
function getCurrentTime(msg)
    return msg.Timestamp -- returns time in milliseconds
end


-- Function to generate a unique transaction ID
function generateTransactionId()
    transactionCounter = transactionCounter + 1
    return "TX" .. tostring(transactionCounter)
end



Handlers.add(
    "checkContract",
    Handlers.utils.hasMatchingTag("Action", "checkContract"),
    checkExpiredContracts
    )

Handlers.add(
    "FetchPrice",
    Handlers.utils.hasMatchingTag("Action", "Fetch-Price"),
    function(m)
        fetchPrice(m)
    end
)

Handlers.add(
    "ClosePositions",
    Handlers.utils.hasMatchingTag("Action", "Close-Positions"),
    function(msg)
        print("Closing positions...")
        ClosePositions()
    end
)


Handlers.add(
    "Receive-Data",
    Handlers.utils.hasMatchingTag("Action", "Receive-Response"),
    function(msg)
        -- Decode the received JSON data
        local res = json.decode(msg.Data)
        
        -- Check if the response contains the city name
        if res.name then
            -- Initialize the ReceivedData table if it's not already initialized
            if not ReceivedData then
                ReceivedData = {}
            end
            
            -- Save the data with the city name as the key
            ReceivedData[res.name] = {
            name = res.name,
            dt = res.dt,
            temp = res.main.temp
        } 
            print(Colors.green .. "Data received and saved for city: " .. res.name)
        else
            print(Colors.red .. "Error: Received data does not contain a city name.")
        end
    end
)

Handlers.add(
    "GetTokenPrice",
    Handlers.utils.hasMatchingTag("Action", "Get-Token-Price"),
    function(msg)
        -- Extract the city name (token) from the incoming message
        local cityName = msg.City
        
        -- Call getTokenPrice with the extracted city name
        local temp = getTokenPrice(cityName)

        -- Handle the temperature (e.g., store it, send it back, etc.)
        if temp then
            print("Temperature for city", cityName, "is", temp)
            -- Perform additional actions, like sending the temperature back to the caller
        else
            print("Failed to retrieve temperature for city", cityName)
        end
    end
)


Handlers.add(
    "trade",
    Handlers.utils.hasMatchingTag("Action", "trade"),
    function(m)
        currentTime = getCurrentTime(m)

        if m.Tags.TradeId and m.Tags.CreatedTime and m.Tags.Country and m.Tags.CountryId and m.Tags.City and m.Tags.CurrentTemp and m.Tags.ContractType
            and m.Tags.ContractStatus and m.Tags.BetAmount then
            -- Convert BetAmount and ContractExpiry to numbers
            local qty = tonumber(m.Tags.BetAmount)

            -- Check if qty or contractExpiry is nil and handle the error
            if qty == nil then
                print("Error: BetAmount is not a valid number.")
                ao.send({ Target = m.From, Data = "Invalid BetAmount. It must be a number." })
                return
            end
            -- Validate qty is a number
            assert(type(qty) == 'number', 'Quantity Tag must be a number')

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
                    Country = m.Tags.Country,
                    City = m.Tags.City,
                    CountryId = m.Tags.CountryId,
                    CurrentTemp = m.Tags.CurrentTemp,
                    ContractType = m.Tags.ContractType,
                    ContractStatus = m.Tags.ContractStatus,
                    CreatedTime = currentTime,
                    ContractExpiry = currentTime + (86400  * 1000), -- Convert minutes to milliseconds
                    BetAmount = qty,
                    Payout = m.Tags.Payout,
                    Outcome = outcome -- Initialize outcome as nil
                }
                print("Trades table after update: " .. tableToJson(openTrades))
                ao.send({ Target = m.From, Data = "Successfully Created Trade" })
            else
                    print("Insufficient balance for " .. m.From)
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
        if not openTrades or next(openTrades) == nil then
            print("openTrades table is empty or nil.")
            ao.send({ Target = m.From, Data = "{}" }) -- Send an empty JSON if there are no trades
            return
        end

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
        -- Check if closedTrades is nil or empty
        if not closedTrades or next(closedTrades) == nil then
            print("closedTrades table is empty or nil.")
            ao.send({ Target = m.From, Data = "{}" }) -- Send an empty JSON if there are no trades
            return
        end

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
    "CronTick", -- handler name
    Handlers.utils.hasMatchingTag("Action", "Cron"),-- handler pattern to identify cron message
    checkExpiredContracts
)


Handlers.add(
    "completeTrade",
    Handlers.utils.hasMatchingTag("Action", "completeTrade"),
    function(m)
        processExpiredContracts(m)
    end
)


Handlers.add(
    "ClearExpiredTrades",
    Handlers.utils.hasMatchingTag("Action", "ClearExpiredTrades"),
    function(m)
        expiredTrades = {}
        print("expiredTrades  have been cleared.")
    end
)

Handlers.add(
    "ClearReceivedData",
    Handlers.utils.hasMatchingTag("Action", "ClearReceivedData"),
    function(m)
        ReceivedData = {}
        print("ReceivedData  has been cleared.")
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

Handlers.add('balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(m)
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
