package azuredx

import (
	"encoding/json"
	"net/http"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

func (adx *AzureDataExplorer) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/databases", adx.getDatabases)
	mux.HandleFunc("/schema", adx.getSchema)
}

const ManagementApiPath = "/v1/rest/mgmt"

func (adx *AzureDataExplorer) getSchema(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "GET" {
		respondWithError(rw, http.StatusMethodNotAllowed, "Invalid method", nil)
		return
	}

	payload := models.RequestPayload{
		CSL:         ".show databases schema as json",
		QuerySource: "schema",
	}

	accessToken, err := adx.serviceCredentials.GetAccessToken(req.Context())
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Azure query denied", err)
		return
	}
	headers := map[string]string{"Authorization": "Bearer " + accessToken}
	response, err := adx.client.KustoRequest(adx.settings.ClusterURL+ManagementApiPath, payload, headers)
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

	accessToken, err := adx.serviceCredentials.GetAccessToken(req.Context())
	if err != nil {
		respondWithError(rw, http.StatusInternalServerError, "Azure query denied", err)
		return
	}
	headers := map[string]string{"Authorization": "Bearer " + accessToken}
	response, err := adx.client.KustoRequest(adx.settings.ClusterURL+ManagementApiPath, payload, headers)
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
