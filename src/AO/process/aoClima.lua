local json = require("json")
local math = require("math")

_0RBIT = "BaMK1dfayo75s3q1ow6AO64UDpD9SEFbeE8xYrY2fyQ"
_0RBT_TOKEN = "BUhZLMwQ6yZHguLtJYA5lLUa9LQzLXMXRfaq9FVcPJc"

local city = city or {} -- Replace with your cities
local BASE_URL = "https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=a2f4db644e9107746535b0d2ca43b85d&units=metric"

FEE_AMOUNT = "1000000000000" -- 1 $0RBT

TOKEN_PRICES = TOKEN_PRICES or {}
balances = balances or {}

ArchivedTrades = ArchivedTrades or {}
WinnersList = WinnersList or {}
-- Credentials token
NOT = "wPmY5MO0DPWpgUGGj8LD7ZmuPmWdYZ2NnELeXdGgctQ"
USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";

-- Table to track addresses that have requested tokens
RequestedAddresses = RequestedAddresses or {}

openTrades = openTrades or {}
expiredTrades = expiredTrades or {}
closedTrades = closedTrades or {}
winners = winners or {}
Profits = Profits or {}

-- Callback function for fetch price
fetchPriceCallback = nil

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


function processExpiredContracts(msg)
    currentTime = tonumber(msg.Timestamp)
    print("Starting to process expired contracts at time:", currentTime)

    -- Check if the expiredTrades list is empty and exit early if it is
    if next(expiredTrades) == nil then
        print("No expired trades to process.")
        return
    end

    -- Define the callback to process expired trades after fetching prices
    local function processTrades()
        for tradeId, trade in pairs(expiredTrades) do
            print("Processing tradeId:", tradeId)
            fetchPrice()
            local closingTemp = getTokenPrice(trade.AssetId)
            if closingTemp then
                trade.ClosingTemp = closingPrice
                trade.ClosingTime = currentTime
                print("Updated trade:", tradeId, "with ClosingPrice:", closingPrice, "and ClosingTime:", currentTime)
                -- Check if the trade is a winner
                if checkTradeWinner(trade, closingTemp) then
                    winners[tradeId] = trade
                else
                    trade.Outcome = "lost"
                    closedTrades[tradeId] = trade
                end
            else
                print("Error: No closing price found for trade:", tradeId, "with AssetId:", trade.AssetId)
            end

            if not trade.ClosingPrice then -- Add check for nil value
                print("Skipping tradeId:", tradeId, "due to nil ClosingPrice.")
            end

            -- Set expired trade to nil after processing
            expiredTrades[tradeId] = nil
        end
    end

    processTrades()

    -- Confirm that sendRewards function is called
    print("Calling sendRewards function")
    sendRewards()

    -- Print final state of expiredTrades
    print("Final state of expiredTrades:")
    for tradeId, trade in pairs(expiredTrades) do
        print("TradeId: " .. tradeId .. ", Trade: " .. tostring(trade))
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

-- Function to get the current time in milliseconds
function getCurrentTime(msg)
    return msg.Timestamp  -- returns time in milliseconds
end


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
                    ContractExpiry = currentTime + (1440 * 60 * 1000), -- Convert minutes to milliseconds
                    BetAmount = qty,
                    Payout = m.Tags.Payout,
                    Outcome = outcome -- Initialize outcome as nil
                }

                print("Trades table after update: " .. tableToJson(openTrades))
                ao.send({ Target = m.From, Data = "Successfully Created Trade" })
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
    end,
    print("Trade Created Succesfully")
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