package azuredx

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

func (adx *AzureDataExplorer) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/databases", adx.getDatabases)
	mux.HandleFunc("/schema", adx.getSchema)
	mux.HandleFunc("/generateQuery", adx.generateQuery)
}

const ManagementApiPath = "/v1/rest/mgmt"

const (
	OpenAIURL   = "https://api.openai.com/v1/chat/completions"
	OpenAIModel = "gpt-3.5-turbo"
)

type openaiBody struct {
	Model    string          `json:"model"`
	Messages []openaiMessage `json:"messages"`
}

type openaiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openaiResponse struct {
	Choices []openaiChoice `json:"choices"`
}

type openaiChoice struct {
	Message struct {
		Content string
	}
}

func (adx *AzureDataExplorer) generateQuery(rw http.ResponseWriter, req *http.Request) {
	client := &http.Client{}
	if req.Method != "POST" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid HTTP method", nil)
		return
	}
	if adx.settings.OpenAIAPIKey == "" {
		respondWithError(rw, http.StatusInternalServerError, "OpenAI API token not found, please add a valid token to the datasource configuration", nil)
		return
	}

	body, _ := io.ReadAll(req.Body)

	reqBody := openaiBody{
		Model: OpenAIModel,
		Messages: []openaiMessage{
			{
				Role:    "user",
				Content: string(body),
			},
		},
	}

	jsonReq, err := json.Marshal(reqBody)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Error reading JSON reqBody", err)
		return
	}

	request, err := http.NewRequest(http.MethodPost, OpenAIURL, bytes.NewReader(jsonReq))
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Error creating HTTP request", err)
		return
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+adx.settings.OpenAIAPIKey)
	resp, err := client.Do(request)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Error during query generation", err)
		return
	}
	defer resp.Body.Close()

	var content openaiResponse
	body, _ = io.ReadAll(resp.Body)
	err = json.Unmarshal(body, &content)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Error parsing generated query", err)
		return
	}
	err = json.NewEncoder(rw).Encode(content)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Error returning generated query", err)
		return
	}
}

func (adx *AzureDataExplorer) getSchema(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	payload := models.RequestPayload{
		CSL:         ".show databases schema as json",
		QuerySource: "schema",
	}

	headers := map[string]string{}
	response, err := adx.client.KustoRequest(req.Context(), adx.settings.ClusterURL+ManagementApiPath, payload, headers)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Azure query unsuccessful", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
	}
}

func (adx *AzureDataExplorer) getDatabases(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	payload := models.RequestPayload{
		CSL: ".show databases",
	}

	headers := map[string]string{}
	response, err := adx.client.KustoRequest(req.Context(), adx.settings.ClusterURL+ManagementApiPath, payload, headers)
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Azure query unsuccessful", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
	}
}

func respondWithError(rw http.ResponseWriter, code int, message string, err error) {
	httpError := models.NewHttpError(message, code, err)
	response, err := json.Marshal(httpError)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(code)
	_, err = rw.Write(response)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
	}
}
